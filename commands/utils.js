// Load the .env file if it exists
require("dotenv").config({ path: 'sample.env'});

const { DefaultAzureCredential } = require('@azure/identity');
const { QueueServiceClient } = require('@azure/storage-queue');
const chalk = require('chalk');

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
    console.log(chalk.redBright('getAzureCredential | Azure AD authentication data is missing.'));
    return false;
  }

  return new DefaultAzureCredential();
}

function getQueueServiceClient() {
  // get credentials for the service principal
  const azCredential = getAzureCredential();
  if (!azCredential) {
    console.log(chalk.redBright('getQueueServiceClient | azCredential is falsey'));
    return;
  }

  // get a QueueServiceClient on the storage account
  const storageAccountName = process.env.ACCOUNT_NAME || '';
  const queueServiceClient = new QueueServiceClient(
    `https://${storageAccountName}.queue.core.windows.net`,
    azCredential
  );
  if (!queueServiceClient) {
    console.log(chalk.redBright('getQueueServiceClient | queueServiceClient is falsey'));
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

module.exports = {
  delay,
  doesQueueExist,
  getAzureCredential,
  getQueueServiceClient,
  getTimeout
};