import { QueueClient, DequeuedMessageItem, logger } from '@azure/storage-queue';
//import { getQueueClientForReceive } from '../common/azQueueHelpers';
import { AzureQueue } from '../lib/AzureQueue';
import { Logger } from '../lib/Logger';
//import { delay, getTimeout } from '../common/misc';
import { RequestMessage, StatusMessage } from '../interfaces/queueMessages';
import { IProcessEnv } from '../lib/IProcessEnv';

const log = new Logger();
const moduleName = 'readStatuses';

function messageHandler (messageString: string): string {
  const fnName = `${moduleName}.messageHandler`;
  const message = <StatusMessage>JSON.parse(messageString);
  const isOk = message.statusCode.toUpperCase() === 'OK';

  if (isOk) {
    log.ok(`${fnName} | requestId ${message.requestId} statusCode ${message.statusCode}`);
    return message.statusCode;
  } else {
    const err = `${fnName} | requestId ${message.requestId} statusCode ${message.statusCode} statusText: ${message.statusText}`;
    log.error(err);
    return err;
  }
}

export async function readStatuses (completedStatusQueueName: string, env: IProcessEnv): Promise<void> {
  const fnName = `${moduleName}.readStatuses`;

  const queue = new AzureQueue(completedStatusQueueName, env);
  const poisonQueue = new AzureQueue(`${completedStatusQueueName}-poison`, env);

  queue.waitForMessages(poisonQueue, messageHandler);
}