// Load the .env file if it exists
require("dotenv").config({ path: 'sample.env'});

const { QueueServiceClient } = require('@azure/storage-queue');
const { getAzureCredential } = require('./azHelpers');
const { logger } = require('./logger');

function getQueueServiceClient() {
  // get credentials for the service principal
  const azCredential = getAzureCredential();
  if (!azCredential) {
    logger.log(logger.logLevels.ERROR, 'getQueueServiceClient | azCredential is falsey');
    return;
  }

  // get a QueueServiceClient on the storage account
  const storageAccountName = process.env.ACCOUNT_NAME || '';
  const queueServiceClient = new QueueServiceClient(
    `https://${storageAccountName}.queue.core.windows.net`,
    azCredential
  );
  if (!queueServiceClient) {
    logger.log(logger.logLevels.ERROR, 'getQueueServiceClient | queueServiceClient is falsey');
  }

  return queueServiceClient;
}

async function doesQueueExist(queueServiceClient, queueName) {
  let found = false;
  const queueIterator = queueServiceClient.listQueues(queueName);
  let item = await queueIterator.next();

  while (!item.done && !found) {
    if (!found && item.value.name == queueName) found = true;
    item = await queueIterator.next()
  }

  return found; 
}

async function createQueueIfNotExists(queueServiceClient, queueName) {
  const exists = await doesQueueExist(queueServiceClient, queueName);
  if (!exists) {
    logger.log(logger.logLevels.INFO, `createQueueIfNotExists | creating queue ${queueName}\n`);
    const res = await queueServiceClient.createQueue(queueName);
    logger.log(logger.logLevels.INFO('createQueueIfNotExists | createQueue response'));
    logger.log(logger.logLevels.VERBOSE, `\n${JSON.stringify(res, null, 3)}\n`);
  } else {
    logger.log(logger.logLevels.INFO, `createQueueIfNotExists | queue ${queueName} exists\n`);
  }
  return;
}

async function getQueueClient(queueServiceClient, queueName) {
  const queueClient = queueServiceClient.getQueueClient(queueName);
  if (!queueClient) { 
    logger.log(logger.logLevels.ERROR, 'getQueueClient | queueClient is falsey');
    return false;
  }
  if (await queueClient.exists()) {
    logger.log(logger.logLevels.INFO, 'getQueueClient | queueClient.exists() is true\n');
    return queueClient;
  } else {
    logger.log(logger.logLevels.ERROR, 'getQueueClient | queueClient.exists() is false');
    return false;
  }
}

async function getQueueClientForReceive(queueName) {
  const queueServiceClient = getQueueServiceClient();
  if (!queueServiceClient) {
    logger.log(logger.logLevels.ERROR, 'getQueueClientForReceive | queueServiceClient is falsey');
    return false;
  } else {
    logger.log(logger.logLevels.INFO, (`getQueueClientForReceive | have queueServiceClient for ${queueServiceClient.url}\n`));
  }

  const exists = await doesQueueExist(queueServiceClient, queueName);
  if (!exists) {
    logger.log(logger.logLevels.ERROR, `getQueueClientForReceive | queue ${queueName} does not exist`);
    return false;
  }
  
  return getQueueClient(queueServiceClient, queueName);
}

async function getQueueClientForSend(queueName) {
  const queueServiceClient = getQueueServiceClient();
  if (!queueServiceClient) {
    logger.log(logger.logLevels.ERROR, 'getQueueClientForSend | queueServiceClient is falsey');
    return false;
  } else {
    logger.log(logger.logLevels.INFO, `getQueueClientForSend | have queueServiceClient for ${queueServiceClient.url}\n`);
  }
  
  await createQueueIfNotExists(queueServiceClient, queueName);

  return getQueueClient(queueServiceClient, queueName);
}

module.exports = {
  createQueueIfNotExists,
  doesQueueExist,
  getAzureCredential,
  getQueueClientForReceive,
  getQueueClientForSend,
  getQueueServiceClient,
};