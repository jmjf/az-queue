import { QueueClient, DequeuedMessageItem, logger } from '@azure/storage-queue';
import { getQueueClientForReceive } from '../common/azQueueHelpers';
import { Logger } from '../lib/Logger';
import { delay, getTimeout } from '../common/misc';
import { RequestMessage } from '../interfaces/queueMessages';

const log = new Logger();

async function receiveMessage(queueClient: QueueClient): Promise<DequeuedMessageItem> {
  const response = await queueClient.receiveMessages();
  if (response.receivedMessageItems.length == 1) {
    const messageItem = response.receivedMessageItems[0];
    const message = <RequestMessage>JSON.parse(Buffer.from(messageItem.messageText, 'base64').toString());
    log.ok(`receiveMessage | received messageId ${messageItem.messageId} requestId ${message.requestId}`);

    return messageItem;
  }
  log.info(`receiveMessage | no messages`);
  return <DequeuedMessageItem><unknown>null;
}

async function deleteMessage(queueClient: QueueClient, messageId: string, popReceipt: string): Promise<void> {
  const deleteResponse = await queueClient.deleteMessage(messageId, popReceipt);
  if (deleteResponse && typeof deleteResponse.errorCode == 'undefined') {
    log.ok(`deleteMessage | deleted ${messageId} on ${deleteResponse?.date?.toISOString()}`);
  } else {
    log.error(`deleteMessage | response for ${messageId} -> ${(deleteResponse) ? deleteResponse.errorCode : 'is falsey'}`);
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

async function readStatuses (completedStatusQueueName: string): Promise<void> {
  const queueClient = await getQueueClientForReceive(completedStatusQueueName);
  if (!queueClient) {
    log.error(`readStatuses | queueClient is falsey`);
    return;
  }
  log.info(`readStatuses | queueClient is good to go\n`);

  let timeout = 0;
  // timeout should never reach MAX_SAFE_INTEGER, so this should be infinite
  // writing it this way avoids an eslint hint to allow constants in loop control variables
  while (timeout < Number.MAX_SAFE_INTEGER) {
    if (await dequeueMessage(queueClient)) {
      timeout = 0;
    } else {
      timeout = getTimeout(timeout);
      log.info(`readStatuses | no message received, waiting ${timeout} ms`);
      await delay(timeout);
    }
    log.divider();
  }
}

export { 
  readStatuses,
  receiveMessage as receiveMessage,
  deleteMessage 
}