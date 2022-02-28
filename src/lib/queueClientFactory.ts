import { DefaultAzureCredential } from '@azure/identity';
import { StorageSharedKeyCredential, QueueClient } from '@azure/storage-queue';
import { IProcessEnv } from './ProcessEnv';
import { Logger } from './Logger';

const log = new Logger();
const moduleName = 'queueClientFactory';

function getAuthMethod(env: IProcessEnv): string {
  const fnName = `${moduleName}.getAuthMethod`;
  const authMethod = env.AUTH_METHOD || '';

  if (authMethod.length === 0) {
    log.error(`${fnName} | env.AUTH_METHOD is falsey or empty`);
    return '';
  }

  return authMethod;
}

function getSharedKeyCredential(env: IProcessEnv): StorageSharedKeyCredential {
  const fnName = `${moduleName}.getSharedKeyCredential`;
  const accountName = env.ACCOUNT_NAME || '';
  const accountKey = env.ACCOUNT_KEY || '';

  if (accountName.length === 0 || accountKey.length === 0) {
    log.error(`${fnName} | sharedkey authentication environment variables missing`);
    return <StorageSharedKeyCredential><unknown>null;
  }

  return new StorageSharedKeyCredential(accountName, accountKey);
}

function getAdCredential(env: IProcessEnv): DefaultAzureCredential {
  const fnName = `${moduleName}.getAdCredential`;

  log.info(`${fnName} | using shared key auth`);
  if (!env.AZURE_TENANT_ID || 
      !env.AZURE_CLIENT_ID ||
      !env.AZURE_CLIENT_SECRET)
  {
    log.error(`${fnName} | ad authentication environment variables missing`);
    return <DefaultAzureCredential><unknown>null;
  }
  return new DefaultAzureCredential();
}

function getAzureCredential(env: IProcessEnv): StorageSharedKeyCredential | DefaultAzureCredential {
  const fnName = `${moduleName}.getAzureCredential`;
  const authMethod = getAuthMethod(env);

  if (authMethod.toLowerCase() === 'sharedkey') {
    return getSharedKeyCredential(env);
  } 
  // else (because all above if branches return)
  if (authMethod.toLowerCase() === 'ad') {
    return getAdCredential(env);
  }

  log.error(`${fnName} | unsupported AUTH_METHOD ${authMethod}`);
  return <StorageSharedKeyCredential><unknown>null;
}

function composeQueueUri(accountUri: string, queueName: string): string {
  if (accountUri[accountUri.length - 1] == '/') {
    return `${accountUri}${queueName}`;
  } else {
    return `${accountUri}/${queueName}`;
  }
}

async function getQueueClient(queueName: string, env: IProcessEnv): Promise<QueueClient> {
  const fnName = `${moduleName}.getQueueClient`;
  
  // get queueUri = accountUri + queueName
  const accountUri = process.env.ACCOUNT_URI || '';
  if (accountUri.length === 0) {
    log.error(`${fnName} | missing account URI`);
    throw new Error('Missing account URI');
  }
  const queueUri = composeQueueUri(accountUri, queueName);

  // will either succeed or throw; I can't do anything about throw
  const azCredential = getAzureCredential(env);
 
  const queueClientOptions = {
    retryOptions: {
      maxTries: 1,
      tryTimeoutInMs: 15 * 1000
    }
  };

  return new QueueClient(queueUri, azCredential, queueClientOptions);
}

async function getQueueClientForReceive(queueName: string, env: IProcessEnv = process.env): Promise<QueueClient> {
  const fnName = `${moduleName}.getQueueClientForReceive`;

  // either succeeds or throws; what can I do if it throws?
  const queueClient = await getQueueClient(queueName, env);

  if (!await queueClient.exists()) {
    log.error(`${fnName} | queue ${queueName} does not exist`);
    throw new Error(`${fnName} | queue ${queueName} does not exist`);
  }
  
  return queueClient;
}

async function getQueueClientForSend(queueName: string, env: IProcessEnv = process.env): Promise<QueueClient> {
  const fnName = `${moduleName}.getQueueClientForSend`;

  const queueClient = await getQueueClient(queueName, env);

  if (!await queueClient.exists()) {    
    log.info(`${fnName} | queue ${queueName} does not exist, creating`);
    // use createIfNotExists() in case something else creates it first
    const res = await queueClient.createIfNotExists();
    if (res._response.status < 200 || res._response.status > 299) {
      log.error(`${fnName} | createIfNotExists returned ${res._response.status} for queue ${queueName}`);
      throw new Error(`${fnName} | createIfNotExists returned ${res._response.status} for queue ${queueName}`);
    }
  }
  
  return queueClient;
}

export {
  getQueueClientForReceive,
  getQueueClientForSend
}