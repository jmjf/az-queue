import { QueueClient, QueueCreateIfNotExistsResponse } from '@azure/storage-queue';
import { IProcessEnv } from '../src/lib/ProcessEnv';
import { QueueDemoError, QDEnvironmentError, QDParameterError } from '../src/lib/QueueDemoErrors';
import { getQueueClientForReceive, getQueueClientForSend, getQueueClient } from '../src/lib/queueClientFactories';

// mocking @azure/storage-queue mocks the QueueClient we imported above so we can jest-ify it
jest.mock('@azure/storage-queue');

describe('getQueueClient()', () => {
  test('should return QueueClient on success', () => {
    const env = <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      ACCOUNT_URI: 'http://nowhere.com/account'
    };

    const res = getQueueClient('queuename', env);

    expect(res instanceof QueueClient).toBe(true);
  });

  // getQueueClient() is not async, so we can expect().toThrow()

  test('should throw QDEnvironmentError if ACCOUNT_URI is missing', () => {
    const env = <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey'
    };

    expect (() => getQueueClient('queuename', env)).toThrow(QDEnvironmentError);
  });

  test('should throw QDEnvironmentError if ACCOUNT_URI is blank or empty', () => {
    const env = <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      ACCOUNT_URI: '   '
    };

    expect (() => getQueueClient('queuename', env)).toThrow(QDEnvironmentError);
  });

  test('should throw QDParameterError if queueName is blank or empty', () => {
    const env = <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      ACCOUNT_URI: 'http://nowhere.com/account'
    };

    expect (() => getQueueClient('   ', env)).toThrow(QDParameterError);
  });
});

describe('getQueueClientForReceive()', () => {
  const getEnv = () => {
    return <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      ACCOUNT_URI: 'http://nowhere.com/account'      
    };
  };

  test('should return a QueueClient if queue exists', async () => {
    // for this test, we want exists() to return true
    jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true)

    const env = getEnv();

    const res = await getQueueClientForReceive('queue', env);

    expect(res instanceof QueueClient).toBe(true);
  });

  test('should throw QDResourceError if queue does not exist', async () => {
    // for this test, we want exists() to return false
    jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(false);

    const env = getEnv();

    // it's an async function so this is how we test for exceptions
    expect.assertions(1);
    try {
      await getQueueClientForReceive('queue', env);
    } catch(e) {
      // without this "cast" we get an error from the expect
      const qde = <QueueDemoError><unknown>e;
      expect(qde.name).toMatch('QDResourceError');
    }
  });
});

describe('getQueueClientForSend()', () => {
  const getEnv = () => {
    return <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      ACCOUNT_URI: 'http://nowhere.com/account'      
    };
  };

  test('should return a QueueClient if queue exists', async () => {
    // for this test, we want exists() to return true
    jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);
    
    const env = getEnv();

    const res = await getQueueClientForSend('queue', env);

    expect(res instanceof QueueClient).toBe(true);
  });

  test('should return a QueueClient if create succeeds', async () => {
    // for this test, we want exists() to return true and createIfNotExists() to return an OK-family status
    jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(true);
    jest.spyOn(QueueClient.prototype, 'createIfNotExists').mockResolvedValue(<QueueCreateIfNotExistsResponse>{_response: {status: 201}});

    const env = getEnv();

    const res = await getQueueClientForSend('queue', env);

    expect(res instanceof QueueClient).toBe(true);
  });

  test('should throw QDResourceError if queue does not exist and create fails', async () => {
    // for this test, we want exists() to return false and createIfNotExists() to return a failure status
    jest.spyOn(QueueClient.prototype, 'exists').mockResolvedValue(false);
    jest.spyOn(QueueClient.prototype, 'createIfNotExists').mockResolvedValue(<QueueCreateIfNotExistsResponse>{_response: {status: 409}});

    const env = getEnv();

    // it's an async function so this is how we test for exceptions
    expect.assertions(1);
    try {
      await getQueueClientForSend('queue', env);
    } catch(e) {
      // without this "cast" we get an error from the expect
      const qde = <QueueDemoError><unknown>e;
      expect(qde.name).toMatch('QDResourceError');
    }
  });
});