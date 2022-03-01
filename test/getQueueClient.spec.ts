import { QueueClient } from '@azure/storage-queue';
import { QDEnvironmentError, QDParameterError } from '../src/lib/QueueDemoErrors';
import { IProcessEnv } from '../src/lib/ProcessEnv';
import { getQueueClient } from '../src/lib/getQueueClient';


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