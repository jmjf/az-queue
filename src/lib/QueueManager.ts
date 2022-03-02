import { QueueClient } from '@azure/storage-queue';
import { Logger } from './Logger';
import { IProcessEnv } from './ProcessEnv';
import { IQueueManagerDeleteResponse, IQueueManagerReceiveResponse, IQueueManagerSendResponse } from '../interfaces/responses';
import { getQueueClient } from './getQueueClient';
import { QDNotReadyError, QDResourceError } from './QueueDemoErrors';

const logger = new Logger();
const moduleName = 'QueueManager';

export class QueueManager {
  // data
  private _queueName: string;
  private _queueClient: QueueClient = <QueueClient><unknown>null;
  private _exists: boolean = <boolean><unknown>null;
  private _halt = false;

  public constructor(queueName: string, env: IProcessEnv) {
    this._queueName = queueName;
    this._queueClient = getQueueClient(queueName, env);
  }

  public get queueName(): string {
    return this._queueName
  }

  public get exists(): boolean {
    return this._exists
  }

  // To send an object (data structure), JSON.stringify() the object and pass as messageText.
  // Include the complete message structure. sendMessage() adds nothing to the message.
  // sendMessage() does base64 encode messageText, so do not send base64 encoded strings.
  // Provide requestId to support call level traceability.
  public async sendMessage(messageText: string, requestId: string = ''): Promise<IQueueManagerSendResponse> {
    const fnName = `${moduleName}.sendMessage`;

    if (this._queueClient === null) {
      logger.error(`${fnName} | queueClient is null | call connect() first`);
      throw new QDNotReadyError(`${fnName} | queueClient is null | call connect() first`);
    }

    if (this._exists === null) {
      const res = await this._queueClient.createIfNotExists();
      if (res._response.status >= 200 && res._response.status <= 299) {
        this._exists = true;
      } else {
        logger.error(`${fnName} | createIfNotExists returned ${res._response.status} | queueName ${this._queueName}`);
        throw new QDResourceError(`${fnName} | createIfNotExists returned ${res._response.status} | queueName ${this._queueName}`);
      }
    }

    // the message needs to be base64 to make the queue trigger happy (for now)
    const base64String = Buffer.from(messageText).toString('base64')
    const options = (requestId.length > 0) ? {requestId: requestId} : {};
    const sendResponse = await this._queueClient.sendMessage(base64String, options);
    
    // set up base response object
    const res =  <IQueueManagerSendResponse>{
      isOk: (sendResponse._response.status === 201),
      traceRequestId: requestId || 'na',
      status: sendResponse._response.status,
      messageId: sendResponse.messageId,
      nextVisibleOn: sendResponse.nextVisibleOn,
      popReceipt: sendResponse.popReceipt,
      respondDatetime: sendResponse.date,
      sendRequestId: sendResponse.requestId
    };

    if (res.isOk) {
      logger.ok(`${fnName} | sent | messageId ${sendResponse.messageId} | clientRequestId ${sendResponse.clientRequestId}`);
    } else {
      logger.error(`${fnName} | status ${sendResponse._response.status} | requestId ${res.traceRequestId}`);
    }
    return res;
  }

  public async receiveMessage(): Promise<IQueueManagerReceiveResponse> {
    const fnName = `${moduleName}.receiveMessage`;

    const receiveResponse = await this._queueClient.receiveMessages();
    if (receiveResponse.receivedMessageItems.length === 1) {
      const messageItem = receiveResponse.receivedMessageItems[0];
      logger.info(`${fnName} | received | messageId ${messageItem.messageId} | queueName ${this._queueName}`)
      return <IQueueManagerReceiveResponse>{
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
      return <IQueueManagerReceiveResponse>{ haveMessage: false };
    }
  }

  public async deleteMessage(messageId: string, popReceipt: string): Promise<IQueueManagerDeleteResponse> {
    const fnName = `${moduleName}.deleteMessage`;

    const deleteResponse = await this._queueClient.deleteMessage(messageId, popReceipt);
    if (deleteResponse.errorCode != 'undefined') {
      logger.warning(`${fnName} | delete failed | queueName ${this._queueName} | messageId ${messageId} | errorCode ${deleteResponse.errorCode || 'not provided'}`);
    }

    return <IQueueManagerDeleteResponse>{
      deleted: (deleteResponse.errorCode != 'undefined'),
      deletedMessageId: messageId,
      errorCode: deleteResponse.errorCode,
      status: deleteResponse._response.status,
      responseDatetime: deleteResponse.date,
      deleteRequestId: deleteResponse.requestId
    }
  }

  public haltWaitForMessages() { this._halt = true; }

  // wait for messages loops infinitely waiting for messages
  // messageHandler must return 0 on success
  public async waitForMessages(messageHandler: Function, poisonQueueManager: QueueManager): Promise<void> {
    const fnName = `${moduleName}.waitForMessages`;

    if (this._exists === null) {
      this._exists = await this._queueClient.exists();
    }
    if (!this._exists) {
      logger.error(`${fnName} | does not exist | queue ${this._queueName}`);
      throw new QDResourceError(`${fnName} | does not exist | queue ${this._queueName}`);
    }

    const delayManager = new DelayManager();

    do {
      const receiveResponse = await this.receiveMessage();
      if (receiveResponse.haveMessage) {
        logger.info(`${fnName} | received | queueName ${this._queueName} | messageId ${receiveResponse.messageId}`)
        // await message handler in case it does async stuff
        const mhRes = await messageHandler(receiveResponse.messageText);
                
        if (mhRes === 0) {
          // messageHandler succeeded
          await this.deleteMessage(receiveResponse.messageId, receiveResponse.popReceipt);
        } else if (receiveResponse.dequeueCount >= 5) {
          // if the message handler failed and the message has been dequeued at least 5 times, it's bad
          const poisonResponse = await poisonQueueManager.sendMessage(receiveResponse.messageText);
          logger.warning(`${fnName} | sent to poison queue | queueName ${this._queueName} | messageId ${receiveResponse.messageId} | poisonQueueName ${poisonQueueManager.queueName} | poisonMessageId ${poisonResponse.messageId}`);
          await this.deleteMessage(receiveResponse.messageId, receiveResponse.popReceipt);
        } // else let the message invisibility expire and retry when it comes back around

        delayManager.resetDelay();
      } else { // no messages
        delayManager.incrementDelay();
        logger.info(`${fnName} | no messages | waiting ${delayManager.currentDelayMs} ms`)
      }
      
      // if halted while processing message, don't delay before halting
      if (!this._halt) { 
        await delayManager.delay();
      }
    } while(!this._halt);
    
    this._halt = false;
  }
}