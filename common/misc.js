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

const getTimeout = currentTimeout => (
  (currentTimeout >= MAX_TIMEOUT) ? MAX_TIMEOUT : currentTimeout + TIMEOUT_INCREMENT
);

module.exports = {
  delay,
  getTimeout
};