const { QueueServiceClient } = require('@azure/storage-queue');
const { v4: uuidv4 } = require('uuid');
const { delay } = require('../common/misc');
const { getQueueClientForSend } = require('../common/azQueueHelpers');
const { logger } = require('../common/logger');

async function sendMessage(queueClient) {
  const now = new Date();
  const message = { 
    requestId: uuidv4(), 
    requestDatetime: now.toISOString(), 
    messageText: `Hello message ${now.valueOf}`
  };
  const messageString = JSON.stringify(message);

  logger.log(logger.logLevels.INFO, `sendMessage | prepared message ${messageString}`);

  const sendResponse = await queueClient.sendMessage(messageString, {requestId: message.requestId});
  if (sendResponse._response.status == 201) {
    logger.log(logger.logLevels.OK, `sendMessage | sent ${sendResponse.messageId} inserted at ${sendResponse.insertedOn.toISOString()} clientRequestId ${sendResponse.clientRequestId}`);
    return true;
  } //else
  logger.log(logger.logLevels.ERROR, `status ${sendResponse.request.status}`);
  logger.log(logger.logLevels.INFO, JSON.stringify(sendResponse.request.operationSpec.responses));
  return false;
}

async function sender(queueName) {
  const queueClient = await getQueueClientForSend(queueName);
  if (!queueClient) {
    logger.log(logger.logLevels.ERROR, 'sender | queueClient is falsey');
    return;
  }
  logger.log(logger.logLevels.INFO, 'sender | queueClient is good to go\n');

  for (i = 0; i < 3; i++) {
    // random returns a floating point number between 0 and <1
    // multiply by 6 and floor() it to get a number between 0 and 5
    // then add 2 to get 2 to 7 and multiply by 1000 to get ms
    const msDelay = ((Math.floor(Math.random() * 6) + 2) * 1000)
    await delay(msDelay)
    await sendMessage(queueClient);
    logger.log(logger.logLevels.DIVIDER);
  }
}

module.exports = { sender }