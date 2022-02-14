// const { QueueServiceClient } = require('@azure/storage-queue');
const { getQueueClientForReceive, getQueueClientForSend } = require('../common/azQueueHelpers');
const { logger } = require('../common/logger');
const { delay, getTimeout } = require('../common/misc');
const { receiveMessage, deleteMessage } = require('./reader');


async function resendMessage(toQueueClient, messageItem, requestId) {
  const now = new Date()
  const message = JSON.parse(messageItem.messageText);
  message.interfaceVersion = '2022-02-11';
  message.relayDatetime = now.toUTCString();
  const messageString = JSON.stringify(message);

  logger.log(logger.logLevels.INFO, `resendMessage | prepared message ${messageString}`);

  const sendResponse = await toQueueClient.sendMessage(messageString, {requestId});
  if (sendResponse._response.status == 201) {
    logger.log(logger.logLevels.OK, `resendMessage | sent ${sendResponse.messageId} inserted at ${sendResponse.insertedOn.toISOString()} clientRequestId ${sendResponse.clientRequestId}`);
    return true;
  } //else
  logger.log(logger.logLevels.ERROR, `resendMessage | status ${sendResponse.request.status}`);
  logger.log(logger.logLevels.INFO, JSON.stringify(sendResponse.request.operationSpec.responses));
  return false;
}

async function resender (fromQueueName, toQueueName) {
  const fromQueueClient = await getQueueClientForReceive(fromQueueName);
  if (!fromQueueClient) {
    logger.log(logger.logLevels.ERROR, 'resender | fromQueueClient is falsey');
    return;
  }
  logger.log(logger.logLevels.INFO, 'resender | fromQueueClient is good to go\n');

  const toQueueClient = await getQueueClientForSend(toQueueName);
  if (!toQueueClient) {
    logger.log(logger.logLevels.ERROR, 'resender | toQueueClient is falsey');
    return;
  }
  logger.log(logger.logLevels.INFO, 'resender | toQueueClient is good to go\n');

  // loop forever reading the queue
  let timeout = 0;
  while (true) {
    const { messageItem, requestId } = await receiveMessage(fromQueueClient);
    //logger.log(logger.logLevels.INFO, JSON.stringify(messageItem, null, 4));
    if (messageItem) {
      timeout = 0;
      if (await resendMessage(toQueueClient, messageItem, requestId)) {
        await deleteMessage(fromQueueClient, messageItem.messageId, messageItem.popReceipt, requestId);
      }
    } else {
      timeout = getTimeout(timeout);
      logger.log(logger.logLevels.INFO, `resender | no message received, waiting ${timeout} ms`);
      await delay(timeout);
    }
    logger.log(logger.logLevels.DIVIDER);
  }
}

module.exports = { resender }