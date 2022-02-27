import { QueueClient, QueueServiceClient } from '@azure/storage-queue';
import { getAzureCredential } from './azHelpers';
import { Logger } from '../lib/Logger';

const log = new Logger();

function getQueueServiceClient(): QueueServiceClient | void {
  // get credentials for the service principal
  const azCredential = getAzureCredential();
  if (!azCredential) {
    log.error(`getQueueServiceClient | azCredential is falsey`);
    return;
  }

  // get a QueueServiceClient on the storage account
  const accountUri = process.env.ACCOUNT_URI || '';
  if (accountUri.length === 0) {
    log.error(`ACCOUNT_URI is falsey or empty`);
    return;
  }

  const queueServiceClient = new QueueServiceClient(
    accountUri,
    azCredential
  );
  if (!queueServiceClient) {
    log.error(`getQueueServiceClient | queueServiceClient is falsey`);
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
    log.info(`createQueueIfNotExists | creating queue ${queueName}\n`);
    const res = await queueServiceClient.createQueue(queueName);
    log.info(`createQueueIfNotExists | createQueue response`);
    log.info(`\n${JSON.stringify(res, null, 3)}\n`);
  } else {
    log.info(`createQueueIfNotExists | queue ${queueName} exists\n`);
  }
  return;
}

async function getQueueClient(queueServiceClient: QueueServiceClient, queueName: string): Promise<QueueClient> {
  const queueClient = queueServiceClient.getQueueClient(queueName);
  if (!queueClient) { 
    log.error(`getQueueClient | queueClient is falsey`);
    return <QueueClient><unknown>null;
  }
  if (await queueClient.exists()) {
    log.info(`getQueueClient | queueClient.exists() is true\n`);
    return queueClient;
  } else {
    log.error(`getQueueClient | queueClient.exists() is false`);
    return <QueueClient><unknown>null;
  }
}

async function getQueueClientForReceive(queueName: string): Promise<QueueClient> {
  const queueServiceClient = getQueueServiceClient();
  if (!queueServiceClient) {
    log.error(`getQueueClientForReceive | queueServiceClient is falsey`);
    return <QueueClient><unknown>null;
  } else {
    log.info(`getQueueClientForReceive | have queueServiceClient for ${queueServiceClient.url}\n`);
  }

  const exists = await doesQueueExist(queueServiceClient, queueName);
  if (!exists) {
    log.error(`getQueueClientForReceive | queue ${queueName} does not exist`);
    return <QueueClient><unknown>null;
  }
  
  return getQueueClient(queueServiceClient, queueName);
}

async function getQueueClientForSend(queueName: string): Promise<QueueClient> {
  const queueServiceClient = getQueueServiceClient();
  if (!queueServiceClient) {
    log.error(`getQueueClientForSend | queueServiceClient is falsey`);
    return <QueueClient><unknown>null;
  } else {
    log.info(`getQueueClientForSend | have queueServiceClient for ${queueServiceClient.url}\n`);
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