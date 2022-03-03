import { QueueClient, QueueCreateIfNotExistsResponse, QueueSendMessageResponse } from '@azure/storage-queue';
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
      messageId: 'messageId_001',
      nextVisibleOn: new Date('2022-03-01'),
      popReceipt: 'popReceipt_001',
      date: new Date('2022-02-28'),
      requestId: 'returnedRequestId_001'
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

    test('returns isOk true and expected results on OK', async () => {
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
      expect(res.nextVisibleOn.toISOString()).toMatch(mockSendResponse_OK.nextVisibleOn.toISOString());
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
})