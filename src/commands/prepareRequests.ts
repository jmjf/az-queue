import { Logger } from '../lib/Logger';
import { PreparedMessage } from '../interfaces/queueMessages';
import { IProcessEnv } from '../lib/IProcessEnv';
import { AzureQueue } from '../lib/AzureQueue';
const queueObjectName = 'AzureQueue';
import { QDResourceError } from '../lib/QueueDemoErrors';

const log = new Logger();
const moduleName = `prepareRequests`;

interface MHOptions { sendQueue: AzureQueue };

function messageHandler(messageString: string, options: MHOptions): string {
  const fnName = `${moduleName}.messageHandler`
  const sendQueue = options?.sendQueue || null;

  // TODO: make AzureQueue object's name a constant somewhere
  if (sendQueue === null || sendQueue.constructor.name !== queueObjectName ) {
    const err = `${fnName} | invalid options.sendQueue`;
    log.error(err);
    // throw because if sendQueue isn't valid, he's dead Jim.
    throw new QDResourceError(err);
  }

  const message = <PreparedMessage>JSON.parse(messageString);
  if (!message.requestId) {
    const err = `${fnName} | message missing requestId`;
    log.error(err);
    // return error message because bad messages aren't fatal (will go to poison queue eventually)
    return err;
  } 
  if (!message.messageText) {
    const err = `${fnName} | message missing messageText | requestId ${message.requestId}`
    log.error(err);
    // return error message because bad messages aren't fatal (will go to poison queue eventually)
    return err;
  }

  const sendMessage = <PreparedMessage>{
    apiVersion: '2022-02-15', // TODO: move supportedApiVersions to shared space and reference
    requestId: message.requestId,
    preparedDatetime: (new Date()).toUTCString(),
    messageText: message.messageText
  }
  
  sendQueue.sendMessage(JSON.stringify(sendMessage), sendMessage.requestId);
  log.ok(`${fnName} | send message for requestId ${sendMessage.requestId}`);
  return 'OK';
}

export async function prepareRequests (receivedRequestsQueueName: string, preparedRequestsQueueName: string, env: IProcessEnv): Promise<void> {
  const fnName = `${moduleName}.prepareRequests`;

  const receiveQueue = new AzureQueue(receivedRequestsQueueName, env);
  const receivePoisonQueue = new AzureQueue(`${receivedRequestsQueueName}-poison`, env);
  const mhOpts: MHOptions = {sendQueue: new AzureQueue(preparedRequestsQueueName, env)};

  receiveQueue.waitForMessages(receivePoisonQueue, messageHandler, mhOpts);
}