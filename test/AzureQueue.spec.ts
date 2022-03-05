import { QueueClient, QueueCreateIfNotExistsResponse, QueueDeleteMessageResponse, 
  QueueReceiveMessageResponse, QueueSendMessageResponse } from '@azure/storage-queue';
import { IProcessEnv } from '../src/lib/IProcessEnv';
import { QDEnvironmentError, QDParameterError, QueueDemoError } from '../src/lib/QueueDemoErrors';
import { AzureQueue } from '../src/lib/AzureQueue';
import { DelayManager } from '../src/lib/DelayManager';
import { IAzureQueueReceiveResponse } from '../src/interfaces/responses';
import { Logger } from '../src/lib/Logger';


// mocking @azure/storage-queue mocks the QueueClient we imported above so we can jest-ify it
jest.mock('@azure/storage-queue');
// same for DelayManager class
jest.mock('../src/lib/DelayManager');
// and Logger to reduce distracting output
jest.mock('../src/lib/Logger');

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

      const testQueue = new AzureQueue(queueName, env);

      expect(testQueue.queueName).toMatch(queueName);
      expect(testQueue.exists).toBeNull();
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
      const existsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);
      jest.spyOn(QueueClient.prototype, 'sendMessage').mockResolvedValue(mockSendResponse_OK);

      const messageText = 'testMessage';
      const requestId = 'testRequest';

      const testQueue = new AzureQueue(queueName, env);
      
      const res = await testQueue.sendMessage(messageText, requestId);

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
      expect(testQueue.exists).toBe(true);

      // clean up mocks to avoid conflicts with future tests
      jest.resetAllMocks();
    });

    test('calls createIfNotExists only once for several sendMessage calls', async () => {
      // 'should return an ok response with expected results' proved the results are right
      // this test proves that it only calls createIfNotExists if it doesn't know the queue exists

      // mock QueueClient calls
      const createIfNotExistsMock = jest.spyOn(QueueClient.prototype, 'createIfNotExists').mockResolvedValue(mockCreateNotExistsResponse_OK);
      const existsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);
      jest.spyOn(QueueClient.prototype, 'sendMessage').mockResolvedValue(mockSendResponse_OK);

      const messageText = 'testMessage';
      const requestId = 'testRequest';
      
      const testQueue = new AzureQueue(queueName, env);
      await testQueue.sendMessage(messageText + 'a', requestId + 'a');
      await testQueue.sendMessage(messageText + 'b', requestId + 'b');
      await testQueue.sendMessage(messageText + 'c', requestId + 'c');
      await testQueue.sendMessage(messageText + 'd', requestId + 'd');

      expect(createIfNotExistsMock).toHaveBeenCalledTimes(1);

      // clean up mocks to avoid conflicts with future tests
      jest.resetAllMocks();
    });

    test('throws QDResourceError if queue does not exist (after createIfNotExists())', async () => {
      const createIfNotExistsMock = jest.spyOn(QueueClient.prototype, 'createIfNotExists').mockResolvedValue(mockCreateNotExistsResponse_ERROR);
      const existsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(false);
      jest.spyOn(QueueClient.prototype, 'sendMessage').mockResolvedValue(mockSendResponse_OK);

      const messageText = 'testMessage';
      const requestId = 'testRequest';

      const testQueue = new AzureQueue(queueName, env);

      // it's an async function so this is how we test for exceptions
      expect.assertions(1);
      try {
        await testQueue.sendMessage(messageText, requestId);
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
      const existsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);
      jest.spyOn(QueueClient.prototype, 'sendMessage').mockResolvedValue(mockSendResponse_ERROR);

      const messageText = 'testMessage';
      const requestId = 'testRequest';

      const testQueue = new AzureQueue(queueName, env);
      
      const res = await testQueue.sendMessage(messageText, requestId);

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
      
      const testQueue = new AzureQueue(queueName, env);
      
      const res = await testQueue.receiveMessage();

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
      
      const testQueue = new AzureQueue(queueName, env);
      
      const res = await testQueue.receiveMessage();

      expect(res.haveMessage).toBe(false);
      expect(res.responseDatetime).toBe(mockReceiveMessagesResponse_NONE.date);
      expect(res.receiveRequestId).toBe(mockReceiveMessagesResponse_NONE.requestId);

      jest.resetAllMocks();
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
      
      const testQueue = new AzureQueue(queueName, env);
      
      const res = await testQueue.deleteMessage(messageId, 'pop receipt');

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
      
      const testQueue = new AzureQueue(queueName, env);
      
      const res = await testQueue.deleteMessage(messageId, 'pop receipt');

      expect(res.didDelete).toBe(false);
      expect(res.messageId).toMatch(messageId);
      expect(res.errorCode).toMatch(mockDeleteMessageResponse_ERROR.errorCode || '');
      expect(res.status).toBe(mockDeleteMessageResponse_ERROR._response.status);
      expect(res.responseDatetime).toBe(mockDeleteMessageResponse_ERROR.date);
      expect(res.deleteRequestId).toBe(mockDeleteMessageResponse_ERROR.requestId);

      jest.resetAllMocks();
    });
  });

  describe('waitForMessages', () => {
    const messageText = 'waitForMessages test message';
    // all responses are for AzureQueue methods, not QueueClient
    const mockReceiveMessageResponse_OK = <IAzureQueueReceiveResponse>{
      haveMessage: true,
      messageText: Buffer.from(messageText, 'base64').toString(),
      messageId: 'messageId_mockReceiveOK_020',
      popReceipt: 'popReceipt_mockReceiveOK_021',
      dequeueCount: 1,
      nextVisibleOn: new Date('2022-02-20'),
      responseDatetime: new Date('2022-02-21'),
      receiveRequestId: 'requestId_mockReceiveOK_022'
    };
    const mockReceiveMessageResponse_NONE = <IAzureQueueReceiveResponse>{
      haveMessage: false,
      responseDatetime: new Date('2022-02-26'),
      receiveRequestId: 'requestId_mockReceiveNONE_030'
    };
    const mockReceiveMessageResponse_POISON = <IAzureQueueReceiveResponse>{
      haveMessage: true,
      messageText: Buffer.from(messageText, 'base64').toString(),
      messageId: 'messageId_mockReceivePOISON_020',
      popReceipt: 'popReceipt_mockReceivePOISON_021',
      dequeueCount: 5,
      nextVisibleOn: new Date('2022-02-20'),
      responseDatetime: new Date('2022-02-21'),
      receiveRequestId: 'requestId_mockReceivePOISON_022'
    };
    const mockReceiveMessageResponse_POISON9 = <IAzureQueueReceiveResponse>{
      haveMessage: true,
      messageText: Buffer.from(messageText, 'base64').toString(),
      messageId: 'messageId_mockReceivePOISON9_020',
      popReceipt: 'popReceipt_mockReceivePOISON9_021',
      dequeueCount: 9,
      nextVisibleOn: new Date('2022-02-20'),
      responseDatetime: new Date('2022-02-21'),
      receiveRequestId: 'requestId_mockReceivePOISON9_022'
    };
    const mockSendMessageResponse_OK = {
      isOk: true,
      traceRequestId: 'clientRequestId_mockSendOK_023',
      status: 201,
      messageId: 'messageId_mockSendOK_024',
      nextVisibleOn: new Date('2022-02-23'),
      popReceipt: 'popReceipt_mockSendOK_025',
      responseDatetime: new Date('2022-02-24'),
      sendRequestId: 'requestId_mockSendOK_026',
    };
    const mockDeleteMessageResponse_OK = {
      didDelete: true,
      messageId: 'messageId_mockDeleteOK_027',
      errorCode: 'errorCode_mockDeleteOK_028',
      status: 204,
      responseDatetime: new Date('2022-02-25'),
      deleteRequestId: 'requestId_mockSendOK_029'
    };
    const queueName = 'testqueue';
    const poisonQueueName = 'poisonqueue'
    const env = <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      ACCOUNT_URI: 'http://nowhere.com/account'
    };

    // all the message handlers depend on haltWaitForMessages() working, so I haven't written a specific test for it

    test('throws QDResourceError if queue does not exist', async () => {
      const qcExistsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(false);
      
      // ensure DelayManager methods do nothing and can have calls counted
      const dmDelayMock = jest.spyOn(DelayManager.prototype, 'delay').mockResolvedValue();
      const dmIncrementDelayMock = jest.spyOn(DelayManager.prototype, 'incrementDelay');
      const dmResetDelayMock = jest.spyOn(DelayManager.prototype, 'resetDelay');
      
      // should never call these methods, but mock them to ensure they aren't throwing
      const aqReceiveMessageMock = jest.spyOn(AzureQueue.prototype, 'receiveMessage').mockResolvedValue(mockReceiveMessageResponse_OK);
      const aqSendMessageMock = jest.spyOn(AzureQueue.prototype, 'sendMessage').mockResolvedValue(mockSendMessageResponse_OK);
      const aqDeleteMessageMock = jest.spyOn(AzureQueue.prototype, 'deleteMessage').mockResolvedValue(mockDeleteMessageResponse_OK);

      const testQueue = new AzureQueue(queueName, env);
      const poisonQueue = new AzureQueue(poisonQueueName, env);
      
      let mhCount = 0;
      const messageHandler = () => {
        mhCount++;
        testQueue.haltWaitForMessages();
        return 'OK';
      }

      expect.assertions(7);
      try {
        await testQueue.waitForMessages(poisonQueue, messageHandler);
      } catch(e) {
        // without this "cast" we get an error from the expect
        const qde = <QueueDemoError><unknown>e;
        expect(qde.name).toMatch('QDResourceError');
        expect(dmDelayMock).not.toHaveBeenCalled();
        expect(dmIncrementDelayMock).not.toHaveBeenCalled();
        expect(dmResetDelayMock).not.toHaveBeenCalled();
        expect(aqReceiveMessageMock).not.toHaveBeenCalled();
        expect(aqSendMessageMock).not.toHaveBeenCalled();
        expect(aqDeleteMessageMock).not.toHaveBeenCalled();
      };

      jest.resetAllMocks();
    });

    test('reads, deletes and loops when messageHandler OK', async () => {
      const qcExistsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);

      // ensure DelayManager methods do nothing and can have calls counted
      const dmDelayMock = jest.spyOn(DelayManager.prototype, 'delay').mockResolvedValue();
      const dmIncrementDelayMock = jest.spyOn(DelayManager.prototype, 'incrementDelay');
      const dmResetDelayMock = jest.spyOn(DelayManager.prototype, 'resetDelay');

      // mock AzureQueue methods so we have better control
      const aqReceiveMessageMock = jest.spyOn(AzureQueue.prototype, 'receiveMessage').mockResolvedValue(mockReceiveMessageResponse_OK);
      const aqSendMessageMock = jest.spyOn(AzureQueue.prototype, 'sendMessage').mockResolvedValue(mockSendMessageResponse_OK);
      const aqDeleteMessageMock = jest.spyOn(AzureQueue.prototype, 'deleteMessage').mockResolvedValue(mockDeleteMessageResponse_OK);
      
      const testQueue = new AzureQueue(queueName, env);
      const poisonQueue = new AzureQueue(poisonQueueName, env);
      
      let mhCount = 0;
      const messageHandler = () => {
        mhCount++;
        if (mhCount >= 3) {
          testQueue.haltWaitForMessages();
        }
        return 'OK';
      };

      await testQueue.waitForMessages(poisonQueue, messageHandler);
      
      expect(mhCount).toBe(3);
      expect(aqReceiveMessageMock).toHaveBeenCalledTimes(3);
      expect(aqDeleteMessageMock).toHaveBeenCalledTimes(3);
      expect(aqSendMessageMock).not.toHaveBeenCalled();  // deletes were not for poison queue
      expect(dmResetDelayMock).toHaveBeenCalledTimes(3); // each read should resetDelay();

      jest.resetAllMocks();
    });

    test('reads, loops, no poison queue when message handler fails and dequeueCount < 5', async () => {
      const qcExistsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);

      // ensure DelayManager methods do nothing and can have calls counted
      const dmDelayMock = jest.spyOn(DelayManager.prototype, 'delay').mockResolvedValue();
      const dmIncrementDelayMock = jest.spyOn(DelayManager.prototype, 'incrementDelay');
      const dmResetDelayMock = jest.spyOn(DelayManager.prototype, 'resetDelay');

      // mock AzureQueue methods so we have better control
      const aqReceiveMessageMock = jest.spyOn(AzureQueue.prototype, 'receiveMessage').mockResolvedValue(mockReceiveMessageResponse_OK);
      const aqSendMessageMock = jest.spyOn(AzureQueue.prototype, 'sendMessage').mockResolvedValue(mockSendMessageResponse_OK);
      const aqDeleteMessageMock = jest.spyOn(AzureQueue.prototype, 'deleteMessage').mockResolvedValue(mockDeleteMessageResponse_OK);
      
      const testQueue = new AzureQueue(queueName, env);
      const poisonQueue = new AzureQueue(poisonQueueName, env);
      
      let mhCount = 0;
      const messageHandler = () => {
        mhCount++;
        if (mhCount >= 3) {
          testQueue.haltWaitForMessages();
        }
        return 'FAIL';
      };

      await testQueue.waitForMessages(poisonQueue, messageHandler);
      
      expect(mhCount).toBe(3);
      expect(aqReceiveMessageMock).toHaveBeenCalledTimes(3);
      expect(aqSendMessageMock).not.toHaveBeenCalled();     // didn't send to poison queue because didn't meet threshold
      expect(aqDeleteMessageMock).not.toHaveBeenCalled();   // didn't delete
      
      jest.resetAllMocks();
    });

    test('reads, loops, poison queue when message handler fails and dequeueCount === 5', async () => {
      const qcExistsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);

      // ensure DelayManager methods do nothing and can have calls counted
      const dmDelayMock = jest.spyOn(DelayManager.prototype, 'delay').mockResolvedValue();
      const dmIncrementDelayMock = jest.spyOn(DelayManager.prototype, 'incrementDelay');
      const dmResetDelayMock = jest.spyOn(DelayManager.prototype, 'resetDelay');

      // mock AzureQueue methods so we have better control
      const aqReceiveMessageMock = jest.spyOn(AzureQueue.prototype, 'receiveMessage').mockResolvedValue(mockReceiveMessageResponse_POISON);
      const aqSendMessageMock = jest.spyOn(AzureQueue.prototype, 'sendMessage').mockResolvedValue(mockSendMessageResponse_OK);
      const aqDeleteMessageMock = jest.spyOn(AzureQueue.prototype, 'deleteMessage').mockResolvedValue(mockDeleteMessageResponse_OK);
      
      const testQueue = new AzureQueue(queueName, env);
      const poisonQueue = new AzureQueue(poisonQueueName, env);
      
      let mhCount = 0;
      const messageHandler = () => {
        mhCount++;
        testQueue.haltWaitForMessages();
        return 'FAIL';
      };

      await testQueue.waitForMessages(poisonQueue, messageHandler);
      
      expect(mhCount).toBe(1);
      expect(aqReceiveMessageMock).toHaveBeenCalled();
      expect(aqSendMessageMock).toHaveBeenCalled();     // sent to poison queue
      expect(aqDeleteMessageMock).toHaveBeenCalled();   // deleted
      
      jest.resetAllMocks();
    });

    test('reads, loops, poison queue when message handler fails and dequeueCount > 5', async () => {
      const qcExistsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);

      // ensure DelayManager methods do nothing and can have calls counted
      const dmDelayMock = jest.spyOn(DelayManager.prototype, 'delay').mockResolvedValue();
      const dmIncrementDelayMock = jest.spyOn(DelayManager.prototype, 'incrementDelay');
      const dmResetDelayMock = jest.spyOn(DelayManager.prototype, 'resetDelay');

      // mock AzureQueue methods so we have better control
      const aqReceiveMessageMock = jest.spyOn(AzureQueue.prototype, 'receiveMessage').mockResolvedValue(mockReceiveMessageResponse_POISON9);
      const aqSendMessageMock = jest.spyOn(AzureQueue.prototype, 'sendMessage').mockResolvedValue(mockSendMessageResponse_OK);
      const aqDeleteMessageMock = jest.spyOn(AzureQueue.prototype, 'deleteMessage').mockResolvedValue(mockDeleteMessageResponse_OK);
      
      const testQueue = new AzureQueue(queueName, env);
      const poisonQueue = new AzureQueue(poisonQueueName, env);
      
      let mhCount = 0;
      const messageHandler = () => {
        mhCount++;
        testQueue.haltWaitForMessages();
        return 'FAIL';
      };

      await testQueue.waitForMessages(poisonQueue, messageHandler);
      
      expect(mhCount).toBe(1);
      expect(aqReceiveMessageMock).toHaveBeenCalled();
      expect(aqSendMessageMock).toHaveBeenCalled();     // sent to poison queue
      expect(aqDeleteMessageMock).toHaveBeenCalled();   // deleted
      
      jest.resetAllMocks();
    });

    test('loops on no message', async () => {
      const qcExistsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);

      // ensure DelayManager methods can have calls counted
      let dmCount = 0;
      const dmDelayMock = jest.spyOn(DelayManager.prototype, 'delay').mockImplementation(() => {
        // for this test, we're calling delay(), so need to haltWaitForMessages() here after a few loops
        dmCount++;
        if (dmCount >= 3) {
          testQueue.haltWaitForMessages();
        }
        return new Promise(res => { setTimeout(res, 1) });
      });
      const dmIncrementDelayMock = jest.spyOn(DelayManager.prototype, 'incrementDelay');
      const dmResetDelayMock = jest.spyOn(DelayManager.prototype, 'resetDelay');

      // mock AzureQueue methods so we have better control
      const aqReceiveMessageMock = jest.spyOn(AzureQueue.prototype, 'receiveMessage').mockResolvedValue(mockReceiveMessageResponse_NONE);
      const aqSendMessageMock = jest.spyOn(AzureQueue.prototype, 'sendMessage').mockResolvedValue(mockSendMessageResponse_OK);
      const aqDeleteMessageMock = jest.spyOn(AzureQueue.prototype, 'deleteMessage').mockResolvedValue(mockDeleteMessageResponse_OK);
      
      const testQueue = new AzureQueue(queueName, env);
      const poisonQueue = new AzureQueue(poisonQueueName, env);
      
      let mhCount = 0;
      const messageHandler = () => {
        mhCount++;
        if (mhCount >= 3) {
          testQueue.haltWaitForMessages();
        }
        return 'OK';
      };

      await testQueue.waitForMessages(poisonQueue, messageHandler);
      
      expect(dmCount).toBe(3);    // called delay
      expect(mhCount).toBe(0);    // did not call message handler
      expect(aqReceiveMessageMock).toHaveBeenCalledTimes(3);
      expect(aqSendMessageMock).not.toHaveBeenCalled();     // didn't send to poison queue because didn't meet threshold
      expect(aqDeleteMessageMock).not.toHaveBeenCalled();   // didn't delete
      expect(dmDelayMock).toHaveBeenCalledTimes(3);
      expect(dmIncrementDelayMock).toHaveBeenCalledTimes(3);
      expect(dmResetDelayMock).not.toHaveBeenCalled();      // only happens when receive gets a message, so shouldn't be called
      
      jest.resetAllMocks();
    });

    test('halt is reset on exit', async () => {
      const qcExistsMock = jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);

      // ensure DelayManager methods do nothing and can have calls counted
      const dmDelayMock = jest.spyOn(DelayManager.prototype, 'delay').mockResolvedValue();
      const dmIncrementDelayMock = jest.spyOn(DelayManager.prototype, 'incrementDelay');
      const dmResetDelayMock = jest.spyOn(DelayManager.prototype, 'resetDelay');

      // mock AzureQueue methods so we have better control
      const aqReceiveMessageMock = jest.spyOn(AzureQueue.prototype, 'receiveMessage').mockResolvedValue(mockReceiveMessageResponse_OK);
      const aqSendMessageMock = jest.spyOn(AzureQueue.prototype, 'sendMessage').mockResolvedValue(mockSendMessageResponse_OK);
      const aqDeleteMessageMock = jest.spyOn(AzureQueue.prototype, 'deleteMessage').mockResolvedValue(mockDeleteMessageResponse_OK);
      
      const testQueue = new AzureQueue(queueName, env);
      const poisonQueue = new AzureQueue(poisonQueueName, env);
      
      let mhCount = 0;
      const messageHandler = () => {
        mhCount++;
        if (mhCount >= 3) {
          testQueue.haltWaitForMessages();
        }
        return 'OK';
      };

      // waitForMessages() once
      await testQueue.waitForMessages(poisonQueue, messageHandler);
      expect(mhCount).toBe(3);   // ran 3 loops as expected

      // when we run again, should get three loops
      // proves halt reset because loop stops when halt is true
      mhCount = 0;
      await testQueue.waitForMessages(poisonQueue, messageHandler);
      expect(mhCount).toBe(3);

      jest.resetAllMocks();
    });

  });
});