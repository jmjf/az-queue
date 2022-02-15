import { QueueClient, DequeuedMessageItem } from '@azure/storage-queue';
import { getQueueClientForReceive } from '../common/azQueueHelpers';
import * as logger from '../common/logger';
import { delay, getTimeout } from '../common/misc';
import { RequestMessage } from '../interfaces/queueMessages';

async function receiveMessage(queueClient: QueueClient): Promise<DequeuedMessageItem> {
  const response = await queueClient.receiveMessages();
  if (response.receivedMessageItems.length == 1) {
    const messageItem = response.receivedMessageItems[0];
    //console.log(JSON.stringify(response, null, 4));
    const message = <RequestMessage>JSON.parse(messageItem.messageText);
    logger.log(logger.LogLevels.OK, (`receiveMessage | received messageId ${messageItem.messageId} requestId ${message.requestId}`));
    logger.log(logger.LogLevels.VERBOSE, `${messageItem.messageText}`);

    return messageItem;
  }
  logger.log(logger.LogLevels.INFO, 'receiveMessage | no messages');
  return <DequeuedMessageItem><unknown>null;
}

async function deleteMessage(queueClient: QueueClient, messageId: string, popReceipt: string): Promise<void> {
  const deleteResponse = await queueClient.deleteMessage(messageId, popReceipt);
  if (deleteResponse && typeof deleteResponse.errorCode == 'undefined') {
    logger.log(logger.LogLevels.OK, `deleteMessage | deleted ${messageId} on ${deleteResponse?.date?.toISOString()}`);
  } else {
    logger.log(logger.LogLevels.ERROR, `deleteMessage | response for ${messageId} -> ${(deleteResponse) ? deleteResponse.errorCode : 'is falsey'}`);
  }
  return;
}

async function dequeueMessage(queueClient: QueueClient): Promise<boolean> {
  // deleteMessage doesn't seem to accept a client-supplied requestId for tracing, so ignore it here
  const messageItem = await receiveMessage(queueClient);
    if (messageItem) {
      // it isn't clearly documented in MS docs, but looking at the code on GitHub, it looks like everything accepts a {clientRequestId} option
      await deleteMessage(queueClient, messageItem.messageId, messageItem.popReceipt);
      return true;
    } // else
    return false;
}

async function reader (queueName: string): Promise<void> {
  const queueClient = await getQueueClientForReceive(queueName);
  if (!queueClient) {
    logger.log(logger.LogLevels.ERROR, 'reader | queueClient is falsey');
    return;
  }
  logger.log(logger.LogLevels.INFO, 'reader | queueClient is good to go\n');

  let timeout = 0;
  // timeout should never reach MAX_SAFE_INTEGER, so this should be infinite
  // writing it this way avoids an eslint hint to allow constants in loop control variables
  while (timeout < Number.MAX_SAFE_INTEGER) {
    if (await dequeueMessage(queueClient)) {
      timeout = 0;
    } else {
      timeout = getTimeout(timeout);
      logger.log(logger.LogLevels.INFO, `reader | no message received, waiting ${timeout} ms`);
      await delay(timeout);
    }
    logger.log(logger.LogLevels.DIVIDER);
  }
}

export { 
  reader,
  receiveMessage,
  deleteMessage 
}