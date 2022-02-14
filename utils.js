// Load the .env file if it exists
require("dotenv").config({ path: 'sample.env'});

const { DefaultAzureCredential } = require('@azure/identity');
const { QueueServiceClient } = require('@azure/storage-queue');
const { logger } = require('./logger');

const TIMEOUT_INCREMENT = parseInt(process.env.TIMEOUT_INCREMENT, 10) || 1000; // 1 second
const MAX_TIMEOUT = parseInt(process.env.MAX_TIMEOUT, 10) || 10000; // 10 seconds

// this expression defines a function (delay) that lets us wait
// for the specified number of milliseconds
// await delay(500); // wait 500ms before proceeding
const delay = ms => new Promise(res => setTimeout(res, ms));

function getAzureCredential() {
  if (!process.env.AZURE_TENANT_ID || 
      !process.env.AZURE_CLIENT_ID ||
      !process.env.AZURE_CLIENT_SECRET
  ) {
    logger.log(logger.logLevels.ERROR, 'getAzureCredential | Azure AD authentication data is missing.');
    return false;
  }

  return new DefaultAzureCredential();
}

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

function getTimeout(timeout) {
  return ((timeout >= MAX_TIMEOUT) ? MAX_TIMEOUT : timeout + TIMEOUT_INCREMENT);
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
  delay,
  doesQueueExist,
  getAzureCredential,
  getQueueClientForReceive,
  getQueueClientForSend,
  getQueueServiceClient,
  getTimeout
};