import { QueueClient } from '@azure/storage-queue';
import { v4 as uuidv4 } from 'uuid';
import { delay } from '../common/misc';
import { getQueueClientForSend } from '../common/azQueueHelpers';
import * as logger from '../common/logger';
import { RequestMessage } from '../interfaces/queueMessages';

async function sendMessage(queueClient: QueueClient): Promise<boolean> {
  const now: Date = new Date();
  const message: RequestMessage = { 
    requestId: uuidv4(), 
    requestDatetime: now.toISOString(), 
    messageText: `Hello message ${now.valueOf}`
  };
  const messageString: string = JSON.stringify(message);

  logger.log(logger.LogLevels.INFO, `sendMessage | prepared message ${messageString}`);

  const sendResponse = await queueClient.sendMessage(messageString, {requestId: message.requestId});
  if (sendResponse._response.status == 201) {
    logger.log(logger.LogLevels.OK, `sendMessage | sent ${sendResponse.messageId} inserted at ${sendResponse.insertedOn.toISOString()} clientRequestId ${sendResponse.clientRequestId}`);
    return true;
  } //else
  logger.log(logger.LogLevels.ERROR, `status ${sendResponse._response.status}`);
  logger.log(logger.LogLevels.INFO, JSON.stringify(sendResponse._response.request.operationSpec?.responses));
  return false;
}

async function sender(queueName): Promise<void> {
  const queueClient = await getQueueClientForSend(queueName);
  if (!queueClient) {
    logger.log(logger.LogLevels.ERROR, 'sender | queueClient is falsey');
    return;
  }
  logger.log(logger.LogLevels.INFO, 'sender | queueClient is good to go\n');

  for (let i = 0; i < 3; i++) {
    // random returns a floating point number between 0 and <1
    // multiply by 6 and floor() it to get a number between 0 and 5
    // then add 2 to get 2 to 7 and multiply by 1000 to get ms
    const msDelay = ((Math.floor(Math.random() * 6) + 2) * 1000)
    await delay(msDelay)
    await sendMessage(queueClient);
    logger.log(logger.LogLevels.DIVIDER);
  }
}

export { sender };