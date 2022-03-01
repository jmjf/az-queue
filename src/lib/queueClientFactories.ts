import { QueueClient } from '@azure/storage-queue';
import { getQueueClient } from './getQueueClient';
import { QDResourceError } from './QueueDemoErrors';
import { IProcessEnv } from './ProcessEnv';
import { Logger } from './Logger';

const log = new Logger();
const moduleName = 'queueClientFactories';

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