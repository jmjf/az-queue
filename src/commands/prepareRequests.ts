import { DequeuedMessageItem, QueueClient } from '@azure/storage-queue';
import { getQueueClientForReceive, getQueueClientForSend } from '../common/azQueueHelpers';
import { Logger } from '../lib/Logger';
import { delay, getTimeout } from '../common/misc';
import { RequestMessage, PreparedMessage } from '../interfaces/queueMessages';
import { receiveMessage, deleteMessage } from './readStatuses';

const log = new Logger();

async function publishPreparedMessage(toQueueClient: QueueClient, messageItem: DequeuedMessageItem): Promise<boolean> {
  const now = new Date()
  const receivedMessage = <RequestMessage>JSON.parse(Buffer.from(messageItem.messageText, 'base64').toString());
  const message = <PreparedMessage>{
    apiVersion: '2022-02-15', // TODO: move supportedApiVersions to shared space and reference
    requestId: receivedMessage.requestId,
    preparedDatetime: now.toUTCString(),
    messageText: receivedMessage.messageText
  }

  const messageString = JSON.stringify(message);

  log.info(`publishPreparedMessage | prepared message ${messageString}`);

  // the message needs to be base64 to make the queue trigger happy (for now)
  const sendResponse = await toQueueClient.sendMessage(Buffer.from(messageString).toString('base64'), {requestId: receivedMessage.requestId});
  if (sendResponse._response.status == 201) {
    log.ok(`publishPreparedMessage | sent ${sendResponse.messageId} inserted at ${sendResponse.insertedOn.toISOString()} clientRequestId ${sendResponse.clientRequestId}`);
    return true;
  } //else
  log.error(`publishPreparedMessage | status ${sendResponse._response.status}`);
  log.info(JSON.stringify(sendResponse._response.request.operationSpec?.responses));
  return false;
}

async function prepareRequests (receivedRequestsQueueName: string, preparedRequestsQueueName: string): Promise<void> {
  const fromQueueClient = await getQueueClientForReceive(receivedRequestsQueueName);
  if (!fromQueueClient) {
    log.error(`prepareRequests | fromQueueClient is falsey`);
    return;
  }
  log.info(`prepareRequests | fromQueueClient is good to go\n`);

  const toQueueClient = await getQueueClientForSend(preparedRequestsQueueName);
  if (!toQueueClient) {
    log.error(`prepareRequests | toQueueClient is falsey`);
    return;
  }
  log.info(`prepareRequests | toQueueClient is good to go\n`);

  let timeout = 0;
  // condition should never be true; avoid an eslint hint to escape an error
  while (timeout < Number.MAX_SAFE_INTEGER) {
    const messageItem = await receiveMessage(fromQueueClient);
    if (messageItem) {
      timeout = 0;
      if (await publishPreparedMessage(toQueueClient, messageItem)) {
        await deleteMessage(fromQueueClient, messageItem.messageId, messageItem.popReceipt);
      }
    } else {
      timeout = getTimeout(timeout);
      log.info(`prepareRequests | no message received, waiting ${timeout} ms`);
      await delay(timeout);
    }
    log.divider();
  }
  return;
}

export { prepareRequests }