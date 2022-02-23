import { DequeuedMessageItem, QueueClient } from '@azure/storage-queue';
import { getQueueClientForReceive, getQueueClientForSend } from '../common/azQueueHelpers';
import * as logger from '../common/logger';
import { delay, getTimeout } from '../common/misc';
import { RequestMessage, PreparedMessage } from '../interfaces/queueMessages';
import { receiveMessage, deleteMessage } from './readStatuses';


async function publishPreparedMessage(toQueueClient: QueueClient, messageItem: DequeuedMessageItem, requestId: string): Promise<boolean> {
  const now = new Date()
  const message: PreparedMessage = {
    interfaceVersion: '2022-02-11',
    relayDatetime: now.toUTCString(),
    messageText: messageItem.messageText
  }

  const messageString = JSON.stringify(message);

  logger.log(logger.LogLevels.INFO, `publishPreparedMessage | prepared message ${messageString}`);

  const sendResponse = await toQueueClient.sendMessage(messageString, {requestId});
  if (sendResponse._response.status == 201) {
    logger.log(logger.LogLevels.OK, `publishPreparedMessage | sent ${sendResponse.messageId} inserted at ${sendResponse.insertedOn.toISOString()} clientRequestId ${sendResponse.clientRequestId}`);
    return true;
  } //else
  logger.log(logger.LogLevels.ERROR, `publishPreparedMessage | status ${sendResponse._response.status}`);
  logger.log(logger.LogLevels.INFO, JSON.stringify(sendResponse._response.request.operationSpec?.responses));
  return false;
}

async function prepareRequests (receivedRequestsQueueName: string, preparedRequestsQueueName: string): Promise<void> {
  const fromQueueClient = await getQueueClientForReceive(receivedRequestsQueueName);
  if (!fromQueueClient) {
    logger.log(logger.LogLevels.ERROR, 'prepareRequests | fromQueueClient is falsey');
    return;
  }
  logger.log(logger.LogLevels.INFO, 'prepareRequests | fromQueueClient is good to go\n');

  const toQueueClient = await getQueueClientForSend(preparedRequestsQueueName);
  if (!toQueueClient) {
    logger.log(logger.LogLevels.ERROR, 'prepareRequests | toQueueClient is falsey');
    return;
  }
  logger.log(logger.LogLevels.INFO, 'prepareRequests | toQueueClient is good to go\n');

  let timeout = 0;
  // condition should never be true; avoid an eslint hint to escape an error
  while (timeout < Number.MAX_SAFE_INTEGER) {
    const messageItem = await receiveMessage(fromQueueClient);
    //logger.log(logger.LogLevels.INFO, JSON.stringify(messageItem, null, 4));
    if (messageItem) {
      const message = <RequestMessage>JSON.parse(messageItem.messageText);
      timeout = 0;
      if (await publishPreparedMessage(toQueueClient, messageItem, message.requestId)) {
        await deleteMessage(fromQueueClient, messageItem.messageId, messageItem.popReceipt);
      }
    } else {
      timeout = getTimeout(timeout);
      logger.log(logger.LogLevels.INFO, `prepareRequests | no message received, waiting ${timeout} ms`);
      await delay(timeout);
    }
    logger.log(logger.LogLevels.DIVIDER);
  }
  return;
}

export { prepareRequests }