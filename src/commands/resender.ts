// const { QueueServiceClient } = require('@azure/storage-queue');
import { DequeuedMessageItem, QueueClient } from '@azure/storage-queue';
import { getQueueClientForReceive, getQueueClientForSend } from '../common/azQueueHelpers';
import * as logger from '../common/logger';
import { delay, getTimeout } from '../common/misc';
import { RequestMessage, ResendMessage } from '../interfaces/queueMessages';
import { receiveMessage, deleteMessage } from './reader';


async function resendMessage(toQueueClient: QueueClient, messageItem: DequeuedMessageItem, requestId: string): Promise<boolean> {
  const now = new Date()
  const message: ResendMessage = {
    interfaceVersion: '2022-02-11',
    relayDatetime: now.toUTCString(),
    messageText: messageItem.messageText
  }

  const messageString = JSON.stringify(message);

  logger.log(logger.LogLevels.INFO, `resendMessage | prepared message ${messageString}`);

  const sendResponse = await toQueueClient.sendMessage(messageString, {requestId});
  if (sendResponse._response.status == 201) {
    logger.log(logger.LogLevels.OK, `resendMessage | sent ${sendResponse.messageId} inserted at ${sendResponse.insertedOn.toISOString()} clientRequestId ${sendResponse.clientRequestId}`);
    return true;
  } //else
  logger.log(logger.LogLevels.ERROR, `resendMessage | status ${sendResponse._response.status}`);
  logger.log(logger.LogLevels.INFO, JSON.stringify(sendResponse._response.request.operationSpec?.responses));
  return false;
}

async function resender (fromQueueName: string, toQueueName: string): Promise<void> {
  const fromQueueClient = await getQueueClientForReceive(fromQueueName);
  if (!fromQueueClient) {
    logger.log(logger.LogLevels.ERROR, 'resender | fromQueueClient is falsey');
    return;
  }
  logger.log(logger.LogLevels.INFO, 'resender | fromQueueClient is good to go\n');

  const toQueueClient = await getQueueClientForSend(toQueueName);
  if (!toQueueClient) {
    logger.log(logger.LogLevels.ERROR, 'resender | toQueueClient is falsey');
    return;
  }
  logger.log(logger.LogLevels.INFO, 'resender | toQueueClient is good to go\n');

  let timeout = 0;
  // condition should never be true; avoid an eslint hint to escape an error
  while (timeout < Number.MAX_SAFE_INTEGER) {
    const messageItem = await receiveMessage(fromQueueClient);
    //logger.log(logger.LogLevels.INFO, JSON.stringify(messageItem, null, 4));
    if (messageItem) {
      const message = <RequestMessage>JSON.parse(messageItem.messageText);
      timeout = 0;
      if (await resendMessage(toQueueClient, messageItem, message.requestId)) {
        await deleteMessage(fromQueueClient, messageItem.messageId, messageItem.popReceipt);
      }
    } else {
      timeout = getTimeout(timeout);
      logger.log(logger.LogLevels.INFO, `resender | no message received, waiting ${timeout} ms`);
      await delay(timeout);
    }
    logger.log(logger.LogLevels.DIVIDER);
  }
  return;
}

export { resender }