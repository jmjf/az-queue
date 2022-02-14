const { QueueServiceClient } = require('@azure/storage-queue');
const { getQueueClientForReceive } = require('../common/azQueueHelpers');
const { logger } = require('../common/logger');
const { delay, getTimeout } = require('../common/misc');

async function receiveMessage(queueClient) {
  const response = await queueClient.receiveMessages();
  if (response.receivedMessageItems.length == 1) {
    const messageItem = response.receivedMessageItems[0];
    //console.log(JSON.stringify(response, null, 4));
    message = JSON.parse(messageItem.messageText);

    logger.log(logger.logLevels.OK, (`receiveMessage | received messageId ${messageItem.messageId} requestId ${message.requestId}`));
    logger.log(logger.logLevels.VERBOSE, `${messageItem.messageText}`);
    return { messageItem, requestId: message.requestId };
  }
  logger.log(logger.logLevels.INFO, 'receiveMessage | no messages');
  return false;
}

async function deleteMessage(queueClient, messageId, popReceipt) {
  const deleteResponse = await queueClient.deleteMessage(messageId, popReceipt);
  if (deleteResponse && typeof deleteResponse.errorCode == 'undefined') {
    logger.log(logger.logLevels.OK, `deleteMessage | deleted ${messageId} on ${deleteResponse.date.toISOString()}`);
  } else {
    logger.log(logger.logLevels.ERROR, `deleteMessage | response for ${messageId} -> ${(deleteResponse) ? deleteResponse.errorCode : 'is falsey'}`);
  }
}

async function dequeueMessage(queueClient) {
  // deleteMessage doesn't seem to accept a client-supplied requestId for tracing, so ignore it here
  const { messageItem } = await receiveMessage(queueClient);
    if (messageItem) {
      // it isn't clearly documented in MS docs, but looking at the code on GitHub, it looks like everything accepts a {clientRequestId} option
      await deleteMessage(queueClient, messageItem.messageId, messageItem.popReceipt);
      return true;
    } // else
    return false;
}

async function reader (queueName) {
  const queueClient = await getQueueClientForReceive(queueName);
  if (!queueClient) {
    logger.log(logger.logLevels.ERROR, 'reader | queueClient is falsey');
    return;
  }
  logger.log(logger.logLevels.INFO, 'reader | queueClient is good to go\n');

  // loop forever reading the queue
  let timeout = 0;
  while (true) {
    if (await dequeueMessage(queueClient,)) {
      timeout = 0;
    } else {
      timeout = getTimeout(timeout);
      logger.log(logger.logLevels.INFO, `reader | no message received, waiting ${timeout} ms`);
      await delay(timeout);
    }
    logger.log(logger.logLevels.DIVIDER);
  }
}

module.exports = { 
  reader,
  receiveMessage,
  deleteMessage 
}