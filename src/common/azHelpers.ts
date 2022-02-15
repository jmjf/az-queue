// Load the .env file if it exists
import dotenv from 'dotenv';
dotenv.config({ path: './env/dev.env'});

import { DefaultAzureCredential } from '@azure/identity';
import * as logger from './logger';

function getAzureCredential() {
  if (!process.env.AZURE_TENANT_ID || 
      !process.env.AZURE_CLIENT_ID ||
      !process.env.AZURE_CLIENT_SECRET
  ) {
    logger.log(logger.LogLevels.ERROR, 'getAzureCredential | Azure AD authentication data is missing.');
    return false;
  }

  return new DefaultAzureCredential();
}

export {
  getAzureCredential,
};