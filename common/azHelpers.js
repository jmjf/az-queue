// Load the .env file if it exists
require("dotenv").config({ path: 'sample.env'});

const { DefaultAzureCredential } = require('@azure/identity');
const { logger } = require('./logger');

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

module.exports = {
  getAzureCredential,
};