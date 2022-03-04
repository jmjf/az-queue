import { QueueClient, QueueCreateIfNotExistsResponse, QueueDeleteMessageResponse, 
  QueueReceiveMessageResponse, QueueSendMessageResponse } from '@azure/storage-queue';
import { IProcessEnv } from '../src/lib/ProcessEnv';
import { QDEnvironmentError, QDParameterError, QDResourceError, QueueDemoError } from '../src/lib/QueueDemoErrors';
import { AzureQueue } from '../src/lib/AzureQueue';

// mocking @azure/storage-queue mocks the QueueClient we imported above so we can jest-ify it
jest.mock('@azure/storage-queue');

// how to mock a method on QueueClient
// jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true)

describe('AzureQueue', () => {
  describe ('constructor()', () => {
    test('returns an instance initialized as expected', () => {
      const queueName = 'testqueue';
      const env = <IProcessEnv>{
        AUTH_METHOD: 'sharedkey',
        ACCOUNT_NAME: 'accountname',
        ACCOUNT_KEY: 'accountkey',
        ACCOUNT_URI: 'http://nowhere.com/account'
      };

      const azureQueue = new AzureQueue(queueName, env);

      expect(azureQueue.queueName).toMatch(queueName);
      expect(azureQueue.exists).toBeNull();
    });

    test('throws QDParameterError if queuename is empty', () => {
      const queueName = '';
      const env = <IProcessEnv>{
        AUTH_METHOD: 'sharedkey',
        ACCOUNT_NAME: 'accountname',
        ACCOUNT_KEY: 'accountkey',
        ACCOUNT_URI: 'http://nowhere.com/account'
      };

      expect (() => new AzureQueue(queueName, env)).toThrow(QDParameterError);
    });

    test('(_getQueueClient) throws QDEnvironmentError if ACCOUNT_URI is missing', () => {
      const queueName = 'testqueue';
      const env = <IProcessEnv>{
        AUTH_METHOD: 'sharedkey',
        ACCOUNT_NAME: 'accountname',
        ACCOUNT_KEY: 'accountkey'
      };
  
      expect (() => new AzureQueue(queueName, env)).toThrow(QDEnvironmentError);
    });

    test('(_getQueueClient) throws QDEnvironmentError if ACCOUNT_URI is blank or empty', () => {
      const queueName = 'testqueue';
      const env = <IProcessEnv>{
        AUTH_METHOD: 'sharedkey',
        ACCOUNT_NAME: 'accountname',
        ACCOUNT_KEY: 'accountkey',
        ACCOUNT_URI: '   '
      };
  
      expect (() => new AzureQueue(queueName, env)).toThrow(QDEnvironmentError);
    });
  });

  describe('sendMessage()', () => {
    // READ ONLY values shared by tests
    const mockCreateNotExistsResponse_OK = <QueueCreateIfNotExistsResponse>{
      _response: { status: 201 }
    };
    const mockCreateNotExistsResponse_ERROR = <QueueCreateIfNotExistsResponse>{
      _response: { status: 400 }
    };
    const mockSendResponse_OK = <QueueSendMessageResponse>{
      _response: { status: 201 },
      messageId: 'messageId_send001',
      nextVisibleOn: new Date('2022-03-01'),
      popReceipt: 'popReceipt_send001',
      date: new Date('2022-02-28'),
      requestId: 'request_send001'
    };
    const mockSendResponse_ERROR = <QueueSendMessageResponse>{
      _response: { status: 400 }
    };
    const queueName = 'testqueue';
    const env = <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      ACCOUNT_URI: 'http://nowhere.com/account'
    };

    test('returns isOk true and expected result object on OK', async () => {
      // mock QueueClient calls
      const createIfNotExistsMock = jest.spyOn(QueueClient.prototype, 'createIfNotExists').mockResolvedValue(mockCreateNotExistsResponse_OK);
      jest.spyOn(QueueClient.prototype, 'sendMessage').mockResolvedValue(mockSendResponse_OK);

      const messageText = 'testMessage';
      const requestId = 'testRequest';

      const azureQueue = new AzureQueue(queueName, env);
      
      const res = await azureQueue.sendMessage(messageText, requestId);

      expect(res.isOk).toBe(true);
      expect(res.traceRequestId).toMatch(requestId)
      expect(res.status).toBe(mockSendResponse_OK._response.status);
      expect(res.messageId).toMatch(mockSendResponse_OK.messageId);
      expect(res.nextVisibleOn).toBe(mockSendResponse_OK.nextVisibleOn);
      expect(res.popReceipt).toMatch(mockSendResponse_OK.popReceipt);
      // possibly undefined based on types, so || '' to avoid type errors when testing
      expect(res.responseDatetime?.toISOString() || '').toMatch(mockSendResponse_OK.date?.toISOString() || '');
      expect(res.sendRequestId).toMatch(mockSendResponse_OK.requestId || '');
      // this is also important -- did we set the flag?
      expect(azureQueue.exists).toBe(true);

      // clean up mocks to avoid conflicts with future tests
      jest.resetAllMocks();
    });

    test('calls createIfNotExists only once for several sendMessage calls', async () => {
      // 'should return an ok response with expected results' proved the results are right
      // this test proves that it only calls createIfNotExists if it doesn't know the queue exists

      // mock QueueClient calls
      const createIfNotExistsMock = jest.spyOn(QueueClient.prototype, 'createIfNotExists').mockResolvedValue(mockCreateNotExistsResponse_OK);
      jest.spyOn(QueueClient.prototype, 'sendMessage').mockResolvedValue(mockSendResponse_OK);

      const messageText = 'testMessage';
      const requestId = 'testRequest';
      
      const azureQueue = new AzureQueue(queueName, env);
      await azureQueue.sendMessage(messageText + 'a', requestId + 'a');
      await azureQueue.sendMessage(messageText + 'b', requestId + 'b');
      await azureQueue.sendMessage(messageText + 'c', requestId + 'c');
      await azureQueue.sendMessage(messageText + 'd', requestId + 'd');

      expect(createIfNotExistsMock).toHaveBeenCalledTimes(1);

      // clean up mocks to avoid conflicts with future tests
      jest.resetAllMocks();
    });

    test('throws QDResourceError on bad response from createIfNotExists', async () => {
      const createIfNotExistsMock = jest.spyOn(QueueClient.prototype, 'createIfNotExists').mockResolvedValue(mockCreateNotExistsResponse_ERROR);
      jest.spyOn(QueueClient.prototype, 'sendMessage').mockResolvedValue(mockSendResponse_OK);

      const messageText = 'testMessage';
      const requestId = 'testRequest';

      const azureQueue = new AzureQueue(queueName, env);

      // it's an async function so this is how we test for exceptions
      expect.assertions(1);
      try {
        await azureQueue.sendMessage(messageText, requestId);
      } catch(e) {
        // without this "cast" we get an error from the expect
        const qde = <QueueDemoError><unknown>e;
        expect(qde.name).toMatch('QDResourceError');
      }

      // clean up mocks to avoid conflicts with future tests
      jest.resetAllMocks();     
    });

    test('returns isOk false on sendMessage error', async () => {
      // mock QueueClient calls
      const createIfNotExistsMock = jest.spyOn(QueueClient.prototype, 'createIfNotExists').mockResolvedValue(mockCreateNotExistsResponse_OK);
      jest.spyOn(QueueClient.prototype, 'sendMessage').mockResolvedValue(mockSendResponse_ERROR);

      const messageText = 'testMessage';
      const requestId = 'testRequest';

      const azureQueue = new AzureQueue(queueName, env);
      
      const res = await azureQueue.sendMessage(messageText, requestId);

      expect(res.isOk).toBe(false);

      // clean up mocks to avoid conflicts with future tests
      jest.resetAllMocks();
    });
  });

  describe('receiveMessage', () => {
    const testMessage = 'test receive message text';
    const mockReceiveMessagesResponse_OK = <QueueReceiveMessageResponse>{
      receivedMessageItems: [{
        messageId: 'messageId_receive001',
        popReceipt: 'popReceipt_receive001',
        dequeueCount: 0,
        nextVisibleOn: new Date('2022-02-10'),
        messageText: Buffer.from(testMessage).toString('base64')
      }],
      date: new Date('2022-02-12'),
      requestId: 'request_receive002'
    };
    const mockReceiveMessagesResponse_NONE = <QueueReceiveMessageResponse><unknown>{
      receivedMessageItems: [],
      date: new Date('2022-02-10'),
      requestId: 'request_receive002'
    };
    const queueName = 'testqueue';
    const env = <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      ACCOUNT_URI: 'http://nowhere.com/account'
    };

    test('returns haveMessage true and expected result object on OK', async () => {
      // mock QueueClient calls
      const receiveMessagesMock = jest.spyOn(QueueClient.prototype, 'receiveMessages').mockResolvedValue(mockReceiveMessagesResponse_OK);
      
      const azureQueue = new AzureQueue(queueName, env);
      
      const res = await azureQueue.receiveMessage();

      expect(res.haveMessage).toBe(true);
      expect(res.messageText).toMatch(testMessage);
      expect(res.messageId).toMatch(mockReceiveMessagesResponse_OK.receivedMessageItems[0].messageId);
      expect(res.popReceipt).toMatch(mockReceiveMessagesResponse_OK.receivedMessageItems[0].popReceipt);
      expect(res.dequeueCount).toBe(mockReceiveMessagesResponse_OK.receivedMessageItems[0].dequeueCount);
      expect(res.nextVisibleOn).toBe(mockReceiveMessagesResponse_OK.receivedMessageItems[0].nextVisibleOn);
      expect(res.responseDatetime).toBe(mockReceiveMessagesResponse_OK.date);
      expect(res.receiveRequestId).toBe(mockReceiveMessagesResponse_OK.requestId);
      
      // clean up mocks to avoid conflicts with future tests
      jest.resetAllMocks();
    });

    test('returns haveMessage false when no messages received', async () => {
      // mock QueueClient calls
      const receiveMessagesMock = jest.spyOn(QueueClient.prototype, 'receiveMessages').mockResolvedValue(mockReceiveMessagesResponse_NONE);
      
      const azureQueue = new AzureQueue(queueName, env);
      
      const res = await azureQueue.receiveMessage();

      expect(res.haveMessage).toBe(false);
      expect(res.responseDatetime).toBe(mockReceiveMessagesResponse_NONE.date);
      expect(res.receiveRequestId).toBe(mockReceiveMessagesResponse_NONE.requestId);
    });
  });

  describe('deleteMessage', () => {
    const mockDeleteMessageResponse_OK = <QueueDeleteMessageResponse>{
      errorCode: undefined,
      _response: { status: 204 },
      date: new Date('2022-02-14'),
      requestId: 'request_delete001'
    };
    const mockDeleteMessageResponse_ERROR = <QueueDeleteMessageResponse>{
      errorCode: 'error code',
      _response: { status: 400 },
      date: new Date('2022-02-16'),
      requestId: 'request_delete002'
    };
    const queueName = 'testqueue';
    const env = <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      ACCOUNT_URI: 'http://nowhere.com/account'
    };

    test('returns didDelete true and expected result object on OK', async () => {
      // mock QueueClient calls
      const deleteMessageMock = jest.spyOn(QueueClient.prototype, 'deleteMessage').mockResolvedValue(mockDeleteMessageResponse_OK);
      const messageId = 'delete ok';
      
      const azureQueue = new AzureQueue(queueName, env);
      
      const res = await azureQueue.deleteMessage(messageId, 'pop receipt');

      expect(res.didDelete).toBe(true);
      expect(res.messageId).toMatch(messageId);
      expect(res.errorCode).toBeUndefined();
      expect(res.status).toBe(mockDeleteMessageResponse_OK._response.status);
      expect(res.responseDatetime).toBe(mockDeleteMessageResponse_OK.date);
      expect(res.deleteRequestId).toBe(mockDeleteMessageResponse_OK.requestId);
      
      // clean up mocks to avoid conflicts with future tests
      jest.resetAllMocks();
    });

    test('returns didDelete false when delete fails', async () => {
      // mock QueueClient calls
      const deleteMessagesMock = jest.spyOn(QueueClient.prototype, 'deleteMessage').mockResolvedValue(mockDeleteMessageResponse_ERROR);
      const messageId = 'delete error';
      
      const azureQueue = new AzureQueue(queueName, env);
      
      const res = await azureQueue.deleteMessage(messageId, 'pop receipt');

      expect(res.didDelete).toBe(false);
      expect(res.messageId).toMatch(messageId);
      expect(res.errorCode).toMatch(mockDeleteMessageResponse_ERROR.errorCode || '');
      expect(res.status).toBe(mockDeleteMessageResponse_ERROR._response.status);
      expect(res.responseDatetime).toBe(mockDeleteMessageResponse_ERROR.date);
      expect(res.deleteRequestId).toBe(mockDeleteMessageResponse_ERROR.requestId);
    });
  });
});