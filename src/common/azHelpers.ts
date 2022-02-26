import { DefaultAzureCredential } from '@azure/identity';
import { StorageSharedKeyCredential } from '@azure/storage-queue';
import * as logger from './logger';

function getAzureCredential() {
  const fnName = `getAzureCredential`;
  const authMethod = process.env.AUTH_METHOD || '';

  if (authMethod.length === 0) {
    logger.log(logger.LogLevels.ERROR, `${fnName} | AUTH_METHOD is falsey or empty`);
    return false;
  }

  if (authMethod.toLowerCase() === 'sharedkey') {
    logger.log(logger.LogLevels.INFO, `${fnName} | using shared key auth`);
    const accountName = process.env.ACCOUNT_NAME || '';
    const accountKey = process.env.ACCOUNT_KEY || '';
    if (accountName.length === 0 || accountKey.length === 0) {
      logger.log(logger.LogLevels.ERROR, `${fnName} | sharedkey authentication environment is missing`);
      return false;
    }
    logger.log(logger.LogLevels.INFO, `${accountName} | ${accountKey}`);
    return new StorageSharedKeyCredential(accountName, accountKey);
  
  } 
  // else (because all above if branches return)
  if (authMethod.toLowerCase() === 'ad') {
    logger.log(logger.LogLevels.INFO, `${fnName} | using shared key auth`);
    if (!process.env.AZURE_TENANT_ID || 
        !process.env.AZURE_CLIENT_ID ||
        !process.env.AZURE_CLIENT_SECRET)
    {
      logger.log(logger.LogLevels.ERROR, `${fnName} | ad authentication environment is missing`);
      return false;
    }
    return new DefaultAzureCredential();
  }

  logger.log(logger.LogLevels.ERROR, `${fnName} | unsupported AUTH_METHOD ${authMethod}`);
  return false;
}

export {
  getAzureCredential,
}