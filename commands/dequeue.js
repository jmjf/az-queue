const { QueueServiceClient } = require('@azure/storage-queue');
const { getQueueClientForReceive } = require('../common/azQueueHelpers');
const { logger } = require('../common/logger');
const { delay, getTimeout } = require('../common/misc');

async function receiveMessage(queueClient) {
  const response = await queueClient.receiveMessages();
  if (response.receivedMessageItems.length == 1) {
    const messageItem = response.receivedMessageItems[0];
    const message = JSON.parse(messageItem.messageText);

    logger.log(logger.logLevels.OK, (`receiveMessage | received messageId ${messageItem.messageId}`));
    logger.log(logger.logLevels.VERBOSE, `${messageItem.messageText}`);
    return messageItem;
  }
  logger.log(logger.logLevels.INFO, 'receivedMessage | no messages');
  return false;
}

async function deleteMessage(queueClient, messageId, popReceipt) {
  const deleteResponse = await queueClient.deleteMessage(messageId, popReceipt);
  if (deleteResponse && typeof deleteResponse.errorCode == 'undefined') {
    logger.log(logger.logLevels.OK, `deleteMessage | deleted ${messageId} on ${deleteResponse.date}`);
  } else {
    logger.log(logger.logLevels.ERROR, `deleteMessage | response for ${messageId} -> ${(deleteResponse) ? deleteResponse.errorCode : 'is falsey'}`);
  }
}

async function dequeue (queueName) {
  const queueClient = await getQueueClientForReceive(queueName);
  if (!queueClient) {
    logger.log(logger.logLevels.ERROR, 'dequeue | queueClient is falsey');
    return;
  }
  logger.log(logger.logLevels.INFO, 'dequeue | queueClient is good to go\n');

  // loop forever reading the queue
  let timeout = 0;
  while (true) {
    const messageItem = await receiveMessage(queueClient);
    if (messageItem) {
      await deleteMessage(queueClient, messageItem.messageId, messageItem.popReceipt);
      timeout = 0;
    } else {
      timeout = getTimeout(timeout);
      logger.log(logger.logLevels.INFO, `dequeue | no message received, waiting ${timeout} ms`);
      await delay(timeout);
    }
    logger.log(logger.logLevels.DIVIDER);
  }
}

module.exports = { dequeue }