// Load the .env file if it exists
import dotenv from 'dotenv';
dotenv.config({ path: './env/dev.env'});

import { QueueClient, QueueServiceClient } from '@azure/storage-queue';
import { getAzureCredential } from './azHelpers';
import * as logger from './logger';

function getQueueServiceClient(): QueueServiceClient | void {
  // get credentials for the service principal
  const azCredential = getAzureCredential();
  if (!azCredential) {
    logger.log(logger.LogLevels.ERROR, 'getQueueServiceClient | azCredential is falsey');
    return;
  }

  // get a QueueServiceClient on the storage account
  const storageAccountName = process.env.ACCOUNT_NAME || '';
  const queueServiceClient = new QueueServiceClient(
    `https://${storageAccountName}.queue.core.windows.net`,
    azCredential
  );
  if (!queueServiceClient) {
    logger.log(logger.LogLevels.ERROR, 'getQueueServiceClient | queueServiceClient is falsey');
  }

  return queueServiceClient;
}

async function doesQueueExist(queueServiceClient: QueueServiceClient, queueName: string): Promise<boolean> {
  let found = false;
  const queueIterator = queueServiceClient.listQueues({prefix: queueName});
  let item = await queueIterator.next();

  while (!item.done && !found) {
    if (!found && item.value.name == queueName) { 
      found = true;
    }
    item = await queueIterator.next();
  }

  return found; 
}

async function createQueueIfNotExists(queueServiceClient: QueueServiceClient, queueName: string): Promise<void> {
  const exists = await doesQueueExist(queueServiceClient, queueName);
  if (!exists) {
    logger.log(logger.LogLevels.INFO, `createQueueIfNotExists | creating queue ${queueName}\n`);
    const res = await queueServiceClient.createQueue(queueName);
    logger.log(logger.LogLevels.INFO, 'createQueueIfNotExists | createQueue response');
    logger.log(logger.LogLevels.VERBOSE, `\n${JSON.stringify(res, null, 3)}\n`);
  } else {
    logger.log(logger.LogLevels.INFO, `createQueueIfNotExists | queue ${queueName} exists\n`);
  }
  return;
}

async function getQueueClient(queueServiceClient: QueueServiceClient, queueName: string): Promise<QueueClient> {
  const queueClient = queueServiceClient.getQueueClient(queueName);
  if (!queueClient) { 
    logger.log(logger.LogLevels.ERROR, 'getQueueClient | queueClient is falsey');
    return <QueueClient><unknown>null;
  }
  if (await queueClient.exists()) {
    logger.log(logger.LogLevels.INFO, 'getQueueClient | queueClient.exists() is true\n');
    return queueClient;
  } else {
    logger.log(logger.LogLevels.ERROR, 'getQueueClient | queueClient.exists() is false');
    return <QueueClient><unknown>null;
  }
}

async function getQueueClientForReceive(queueName: string): Promise<QueueClient> {
  const queueServiceClient = getQueueServiceClient();
  if (!queueServiceClient) {
    logger.log(logger.LogLevels.ERROR, 'getQueueClientForReceive | queueServiceClient is falsey');
    return <QueueClient><unknown>null;
  } else {
    logger.log(logger.LogLevels.INFO, (`getQueueClientForReceive | have queueServiceClient for ${queueServiceClient.url}\n`));
  }

  const exists = await doesQueueExist(queueServiceClient, queueName);
  if (!exists) {
    logger.log(logger.LogLevels.ERROR, `getQueueClientForReceive | queue ${queueName} does not exist`);
    return <QueueClient><unknown>null;
  }
  
  return getQueueClient(queueServiceClient, queueName);
}

async function getQueueClientForSend(queueName: string): Promise<QueueClient> {
  const queueServiceClient = getQueueServiceClient();
  if (!queueServiceClient) {
    logger.log(logger.LogLevels.ERROR, 'getQueueClientForSend | queueServiceClient is falsey');
    return <QueueClient><unknown>null;
  } else {
    logger.log(logger.LogLevels.INFO, `getQueueClientForSend | have queueServiceClient for ${queueServiceClient.url}\n`);
  }
  
  await createQueueIfNotExists(queueServiceClient, queueName);

  return getQueueClient(queueServiceClient, queueName);
}

export {
  createQueueIfNotExists,
  doesQueueExist,
  getQueueClientForReceive,
  getQueueClientForSend,
  getQueueServiceClient,
};