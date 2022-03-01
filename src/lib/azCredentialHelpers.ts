import { DefaultAzureCredential } from '@azure/identity';
import { StorageSharedKeyCredential } from '@azure/storage-queue';
import { QDEnvironmentError } from './QueueDemoErrors';
import { IProcessEnv } from './ProcessEnv';
import { Logger } from './Logger';

const log = new Logger();
const moduleName = 'azCredentialHelpers';

export function getAuthMethod(env: IProcessEnv): string {
  const fnName = `${moduleName}.getAuthMethod`;
  const authMethod = (env.AUTH_METHOD || '').trim();

  if (authMethod.length < 1) {
    log.error(`${fnName} | env.AUTH_METHOD is missing or empty`);
    throw new QDEnvironmentError(`${fnName} | env.AUTH_METHOD is missing or empty`);
  }

  return authMethod;
}

export function getSharedKeyCredential(env: IProcessEnv): StorageSharedKeyCredential {
  const fnName = `${moduleName}.getSharedKeyCredential`;

  log.info(`${fnName} | using shared key credential`);
  const accountName = (env.ACCOUNT_NAME || '').trim();
  const accountKey = (env.ACCOUNT_KEY || '').trim();

  if ((accountName.length < 1) || (accountKey.length < 1)) {
    log.error(`${fnName} | sharedkey authentication environment variables missing or empty`);
    throw new QDEnvironmentError(`${fnName} | sharedkey authentication environment variables missing`);
  }

  return new StorageSharedKeyCredential(accountName, accountKey);
}

export function getAdCredential(env: IProcessEnv): DefaultAzureCredential {
  const fnName = `${moduleName}.getAdCredential`;

  log.info(`${fnName} | using ad credential`);
  if (!env.AZURE_TENANT_ID || 
      !env.AZURE_CLIENT_ID ||
      !env.AZURE_CLIENT_SECRET)
  {
    log.error(`${fnName} | sharedkey authentication environment variables missing`);
    throw new QDEnvironmentError(`${fnName} | sharedkey authentication environment variables missing`);
  }
  return new DefaultAzureCredential();
}

export function getAzureCredential(env: IProcessEnv): StorageSharedKeyCredential | DefaultAzureCredential {
  const fnName = `${moduleName}.getAzureCredential`;
  const authMethod = getAuthMethod(env);

  if (authMethod.toLowerCase() == 'sharedkey') {
    return getSharedKeyCredential(env);
  } 
  // else (because all above if branches return)
  if (authMethod.toLowerCase() == 'ad') {
    return getAdCredential(env);
  }

  log.error(`${fnName} | unsupported AUTH_METHOD ${authMethod}`);
  throw new QDEnvironmentError(`${fnName} | unsupported AUTH_METHOD ${authMethod}`);
}