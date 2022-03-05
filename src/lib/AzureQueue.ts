import { QueueClient } from '@azure/storage-queue';
import { Logger } from './Logger';
import { IProcessEnv } from './IProcessEnv';
import { getAzureCredential } from './azCredentialHelpers';
import { IAzureQueueDeleteResponse, IAzureQueueReceiveResponse, IAzureQueueSendResponse } from '../interfaces/responses';
import { QDResourceError, QDParameterError, QDEnvironmentError } from './QueueDemoErrors';
import { DelayManager } from './DelayManager';
import { IDelayManagerConfig } from '../interfaces/IDelayManagerConfig';

const log = new Logger();
const moduleName = 'AzureQueue';

export class AzureQueue {
  private readonly _queueName: string;
  private readonly _queueClient: QueueClient = <QueueClient><unknown>null;
  private _exists: boolean = <boolean><unknown>null;
  private _halt = false;

  public constructor(queueName: string, env: IProcessEnv) {
    const fnName = `${moduleName}.constructor`;
    if (queueName.trim().length < 1) {
      log.error(`${fnName} | queueName is empty`);
      throw new QDParameterError(`${fnName} | queueName is empty`);
    }

    this._queueName = queueName;
    this._queueClient = this._getQueueClient(queueName, env);
  }

  public get queueName(): string {
    return this._queueName
  }

  public get exists(): boolean {
    return this._exists
  }

  private _composeQueueUri(accountUri: string, queueName: string): string {
    if (accountUri[accountUri.length - 1] == '/') {
      return `${accountUri}${queueName}`;
    } else {
      return `${accountUri}/${queueName}`;
    }
  }
  
  private _getQueueClient(queueName: string, env: IProcessEnv): QueueClient {
    const fnName = `${moduleName}.getQueueClient`;
  
    // get queueUri = accountUri + queueName
    const accountUri = (env.ACCOUNT_URI || '').trim();
    if (accountUri.length < 1) {
      log.error(`${fnName} | missing account URI`);
      throw new QDEnvironmentError('Missing account URI');
    }
    const queueUri = this._composeQueueUri(accountUri, queueName);
  
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

  // To send an object (data structure), JSON.stringify() the object and pass as messageText.
  // Include the complete message structure. sendMessage() adds nothing to the message.
  // sendMessage() does base64 encode messageText, so do not send base64 encoded strings.
  // Provide requestId to support call level traceability.
  public async sendMessage(messageText: string, requestId: string = ''): Promise<IAzureQueueSendResponse> {
    const fnName = `${moduleName}.sendMessage`;

    if (!this._exists) {
      // createIfNotExists is a wrapper around the create operation
      // See https://docs.microsoft.com/en-us/rest/api/storageservices/create-queue4#remarks
      // * if the queue does not exist and is created, status is 201 and createIfNotExists sets succeeded true
      // * if the queue exists, status is 204, but succeeded is false
      // * if the queue exists and metadata doesn't match, status is 409 and succeeded is false
      // * if the queue name is invalid, status is 400 and succeeded is false
      // for sendMessage's purposes, as long as the queue exists, we're okay, so 201, 204 and 409 are okay responses
      const res = await this._queueClient.createIfNotExists();
      if ([201, 204, 409].includes(res._response.status)) {
        this._exists = true;
      } else {
        log.error(`${fnName} | createIfNotExists returned ${res._response.status} | queueName ${this._queueName}`);
        throw new QDResourceError(`${fnName} | createIfNotExists returned ${res._response.status} | queueName ${this._queueName}`);
      }
    }

    // the message needs to be base64 to make the queue trigger happy (for now)
    const base64String = Buffer.from(messageText).toString('base64')
    const options = (requestId.length > 0) ? {requestId: requestId} : {};
    const sendResponse = await this._queueClient.sendMessage(base64String, options);
    
    // set up base response object
    const res =  <IAzureQueueSendResponse>{
      isOk: (sendResponse._response.status === 201),
      traceRequestId: requestId || '',
      status: sendResponse._response.status,
      messageId: sendResponse.messageId,
      nextVisibleOn: sendResponse.nextVisibleOn,
      popReceipt: sendResponse.popReceipt,
      responseDatetime: sendResponse.date,
      sendRequestId: sendResponse.requestId
    };

    if (res.isOk) {
      log.ok(`${fnName} | sent | messageId ${sendResponse.messageId} | clientRequestId ${sendResponse.clientRequestId}`);
    } else {
      log.error(`${fnName} | status ${sendResponse._response.status} | requestId ${res.traceRequestId}`);
    }
    return res;
  }

  public async receiveMessage(): Promise<IAzureQueueReceiveResponse> {
    const fnName = `${moduleName}.receiveMessage`;
    const receiveOptions = {
      numberOfMessages: 1
    };

    const receiveResponse = await this._queueClient.receiveMessages(receiveOptions);
    if (receiveResponse.receivedMessageItems.length === 1) {
      const messageItem = receiveResponse.receivedMessageItems[0];
      log.info(`${fnName} | received | messageId ${messageItem.messageId} | queueName ${this._queueName}`);
      return <IAzureQueueReceiveResponse>{
        haveMessage: true,
        messageText: Buffer.from(messageItem.messageText, 'base64').toString(),
        messageId: messageItem.messageId,
        popReceipt: messageItem.popReceipt,
        dequeueCount: messageItem.dequeueCount,
        nextVisibleOn: messageItem.nextVisibleOn,
        responseDatetime: receiveResponse.date,
        receiveRequestId: receiveResponse.requestId
      }
    } else {
      return <IAzureQueueReceiveResponse>{ 
        haveMessage: false,
        responseDatetime: receiveResponse.date,
        receiveRequestId: receiveResponse.requestId
      };
    }
  }

  public async deleteMessage(messageId: string, popReceipt: string): Promise<IAzureQueueDeleteResponse> {
    const fnName = `${moduleName}.deleteMessage`;

    const deleteResponse = await this._queueClient.deleteMessage(messageId, popReceipt);
    if (deleteResponse.errorCode != 'undefined') {
      log.warning(`${fnName} | delete failed | queueName ${this._queueName} | messageId ${messageId} | errorCode ${deleteResponse.errorCode || 'not provided'}`);
    }

    return <IAzureQueueDeleteResponse>{
      didDelete: (deleteResponse._response.status === 204),  // operation returns 204 if deleted
      messageId: messageId,
      errorCode: deleteResponse.errorCode,
      status: deleteResponse._response.status,
      responseDatetime: deleteResponse.date,
      deleteRequestId: deleteResponse.requestId
    }
  }

  public haltWaitForMessages() { this._halt = true; }

  // wait for messages loops infinitely waiting for messages
  // messageHandler must return a string; 'OK' on success; error message for log on failure
  // delayManagerConfig is an optional set of parameters to change delay properties
  // see IDelayManagerConfig, unassigned parameters are default in DelayManager constructor
  // 
  public async waitForMessages(poisonQueueService: AzureQueue, messageHandler: Function, messageHandlerOptions: object = {}, delayManagerConfig?: IDelayManagerConfig): Promise<void> {
    const fnName = `${moduleName}.waitForMessages`;

    if (this._exists === null) {
      this._exists = await this._queueClient.exists();
    }
    if (!this._exists) {
      log.error(`${fnName} | does not exist | queue ${this._queueName}`);
      throw new QDResourceError(`${fnName} | does not exist | queue ${this._queueName}`);
    }

    const delayManager = new DelayManager(delayManagerConfig);

    while (!this._halt) {
      const receiveResponse = await this.receiveMessage();
      if (receiveResponse.haveMessage) {
        log.info(`${fnName} | received | queueName ${this._queueName} | messageId ${receiveResponse.messageId}`)
        // await message handler in case it does async stuff
        const mhRes = <string>await messageHandler(receiveResponse.messageText, messageHandlerOptions);
                
        if (mhRes.toUpperCase() == 'OK') {
          // messageHandler succeeded
          await this.deleteMessage(receiveResponse.messageId, receiveResponse.popReceipt);
        } else {
          log.warning(`${fnName} | message handler not OK | ${mhRes}`);
          if (receiveResponse.dequeueCount >= 5) {
            // if the message handler failed and the message has been dequeued at least 5 times, it's bad
            const poisonResponse = await poisonQueueService.sendMessage(receiveResponse.messageText);
            log.warning(`${fnName} | sent to poison queue | queueName ${this._queueName} | messageId ${receiveResponse.messageId} | poisonQueueName ${poisonQueueService.queueName} | poisonMessageId ${poisonResponse.messageId}`);
            await this.deleteMessage(receiveResponse.messageId, receiveResponse.popReceipt);
          }
        } // else let the message invisibility expire and retry when it comes back around

        delayManager.resetDelay();
      } else { // no messages
        delayManager.incrementDelay();
        log.info(`${fnName} | no messages | waiting ${delayManager.currentDelayMs} ms`)
      }
      
      // if halted while processing message, don't delay before halting
      if (!this._halt) { 
        await delayManager.delay();
      }

      log.divider();
    };
    
    this._halt = false;
  }
}