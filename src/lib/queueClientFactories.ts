import { QueueClient } from '@azure/storage-queue';
import { getAzureCredential } from './azCredentialHelpers';
import { QDEnvironmentError, QDParameterError, QDResourceError } from './QueueDemoErrors';
import { IProcessEnv } from './ProcessEnv';
import { Logger } from './Logger';

const log = new Logger();
const moduleName = 'queueClientFactories';

function composeQueueUri(accountUri: string, queueName: string): string {
  if (accountUri[accountUri.length - 1] == '/') {
    return `${accountUri}${queueName}`;
  } else {
    return `${accountUri}/${queueName}`;
  }
}

export function getQueueClient(queueName: string, env: IProcessEnv): QueueClient {
  const fnName = `${moduleName}.getQueueClient`;

  if (queueName.trim().length < 1) {
    log.error(`${fnName} | queueName is empty`);
    throw new QDParameterError(`${fnName} | queueName is empty`);
  }
  
  // get queueUri = accountUri + queueName
  const accountUri = (env.ACCOUNT_URI || '').trim();
  if (accountUri.length < 1) {
    log.error(`${fnName} | missing account URI`);
    throw new QDEnvironmentError('Missing account URI');
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

export async function getQueueClientForReceive(queueName: string, env: IProcessEnv = process.env): Promise<QueueClient> {
  const fnName = `${moduleName}.getQueueClientForReceive`;

  // either succeeds or throws; what can I do if it throws?
  const queueClient = getQueueClient(queueName, env);

  if (!await queueClient.exists()) {
    log.error(`${fnName} | queue ${queueName} does not exist`);
    throw new QDResourceError(`${fnName} | queue ${queueName} does not exist`);
  }
  
  return queueClient;
}

export async function getQueueClientForSend(queueName: string, env: IProcessEnv = process.env): Promise<QueueClient> {
  const fnName = `${moduleName}.getQueueClientForSend`;

  const queueClient = getQueueClient(queueName, env);

  if (!await queueClient.exists()) {    
    log.info(`${fnName} | queue ${queueName} does not exist, creating`);
    // use createIfNotExists() in case something else creates it first
    const res = await queueClient.createIfNotExists();
    if (res._response.status < 200 || res._response.status > 299) {
      log.error(`${fnName} | createIfNotExists returned ${res._response.status} for queue ${queueName}`);
      throw new QDResourceError(`${fnName} | createIfNotExists returned ${res._response.status} for queue ${queueName}`);
    }
  }
  
  return queueClient;
}