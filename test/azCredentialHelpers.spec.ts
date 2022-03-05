import { StorageSharedKeyCredential } from '@azure/storage-queue';
import { DefaultAzureCredential } from '@azure/identity';
import { QDEnvironmentError } from '../src/lib/QueueDemoErrors';
import { IProcessEnv } from '../src/lib/IProcessEnv';
import { getAdCredential, getAuthMethod, getAzureCredential, getSharedKeyCredential } from '../src/lib/azCredentialHelpers';
import { Logger } from '../src/lib/Logger';

// mock Logger so methods do nothing to reduce distracting output
jest.mock('../src/lib/Logger');

describe('getAuthMethod()', () => {

  test('should return value of AUTH_METHOD if not empty', () => {
    const env = <IProcessEnv>{AUTH_METHOD: 'auth-method'};
    
    expect(getAuthMethod(env)).toMatch(env.AUTH_METHOD);
  });

  test('should throw QDEnvironmentError if AUTH_METHOD is missing', () => {
    const env = <IProcessEnv>{};

    expect(() => getAuthMethod(env)).toThrow(QDEnvironmentError);
  });

  test('should throw QDEnvironmentError if AUTH_METHOD is empty', () => {
    const env = <IProcessEnv>{AUTH_METHOD: ''};

    expect(() => getAuthMethod(env)).toThrow(QDEnvironmentError);
  });

  test('should throw QDEnvironmentError if AUTH_METHOD is blank', () => {
    const env = <IProcessEnv>{AUTH_METHOD: '   '};

    expect(() => getAuthMethod(env)).toThrow(QDEnvironmentError);
  });
});

describe('getSharedKeyCredential()', () => {
  test('should return StorageSharedKeyCredential if env values are not empty', () => {
    const env = <IProcessEnv>{ACCOUNT_NAME: 'accountname', ACCOUNT_KEY: 'accountkey'};

    const res = getSharedKeyCredential(env);
    
    expect(res instanceof StorageSharedKeyCredential).toBe(true);
  });

  test('should throw QDEnvironmentError if ACCOUNT_NAME is missing', () => {
    const env = <IProcessEnv>{ACCOUNT_KEY: 'account key'};

    expect(() => getSharedKeyCredential(env)).toThrow(QDEnvironmentError);
  });

  test('should throw QDEnvironmentError if ACCOUNT_KEY is missing', () => {
    const env = <IProcessEnv>{ACCOUNT_NAME: 'account name'};

    expect(() => getSharedKeyCredential(env)).toThrow(QDEnvironmentError);
  });

  test('should throw QDEnvironmentError if ACCOUNT_NAME is empty', () => {
    const env = <IProcessEnv>{ACCOUNT_NAME: '', ACCOUNT_KEY: 'accountkey'};

    expect(() => getSharedKeyCredential(env)).toThrow(QDEnvironmentError);
  });

  test('should throw QDEnvironmentError if ACCOUNT_KEY is empty', () => {
    const env = <IProcessEnv>{ACCOUNT_NAME: 'accountname', ACCOUNT_KEY: ''};

    expect(() => getSharedKeyCredential(env)).toThrow(QDEnvironmentError);
  });

  test('should throw QDEnvironmentError if ACCOUNT_NAME is blank', () => {
    const env = <IProcessEnv>{ACCOUNT_NAME: '    ', ACCOUNT_KEY: 'accountkey'};

    expect(() => getSharedKeyCredential(env)).toThrow(QDEnvironmentError);
  });

  test('should throw QDEnvironmentError if ACCOUNT_KEY is blank', () => {
    const env = <IProcessEnv>{ACCOUNT_NAME: 'accountname', ACCOUNT_KEY: '    '};

    expect(() => getSharedKeyCredential(env)).toThrow(QDEnvironmentError);
  });
});

describe('getAdCredential()', () => {

  test('should return a DefaultAzureCredential if env values are not empty', () => {
    const env = <IProcessEnv>{
      AZURE_TENANT_ID: 'tenantid',
      AZURE_CLIENT_ID: 'clientid',
      AZURE_CLIENT_SECRET: 'clientsecret'
    };

    const res = getAdCredential(env);

    expect(res instanceof DefaultAzureCredential).toBe(true);
  });

  test('should throw a QDEnvironmentError if AZURE_TENANT_ID is missing', () => {
    const env = <IProcessEnv>{
      AZURE_CLIENT_ID: 'clientid',
      AZURE_CLIENT_SECRET: 'clientsecret'
    };

    expect(() => getAdCredential(env)).toThrow(QDEnvironmentError);
  });

  test('should throw a QDEnvironmentError if AZURE_CLIENT_ID is missing', () => {
    const env = <IProcessEnv>{
      AZURE_TENANT_ID: 'tenantid',
      AZURE_CLIENT_SECRET: 'clientsecret'
    };

    expect(() => getAdCredential(env)).toThrow(QDEnvironmentError);
  });

  test('should throw a QDEnvironmentError if AZURE_CLIENT_SECRET is missing', () => {
    const env = <IProcessEnv>{
      AZURE_TENANT_ID: 'tenantid',
      AZURE_CLIENT_ID: 'clientid'
    };

    expect(() => getAdCredential(env)).toThrow(QDEnvironmentError);
  });
});

describe('getAzureCredential()', () => {

  test('should return a StorageSharedKeyCredential for sharedkey', () => {
    const env = <IProcessEnv>{
      AUTH_METHOD: 'sharedkey',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey'
    };

    const res = getAzureCredential(env);

    expect(res instanceof StorageSharedKeyCredential).toBe(true);
  });

  test('should return a DefaultAzureCredential for ad', () => {
    const env = <IProcessEnv>{
      AUTH_METHOD: 'ad',
      AZURE_TENANT_ID: 'tenantid',
      AZURE_CLIENT_ID: 'clientid',
      AZURE_CLIENT_SECRET: 'clientsecret'
    };

    const res = getAzureCredential(env);

    expect(res instanceof DefaultAzureCredential).toBe(true);
  });

  test('should throw QDEnvironmentError for invalid AUTH_METHOD', () => {
    const env = <IProcessEnv>{
      AUTH_METHOD: 'asdf',
      ACCOUNT_NAME: 'accountname',
      ACCOUNT_KEY: 'accountkey',
      AZURE_TENANT_ID: 'tenantid',
      AZURE_CLIENT_ID: 'clientid',
      AZURE_CLIENT_SECRET: 'clientsecret'
    };

    expect(() => getAzureCredential(env)).toThrow(QDEnvironmentError);
  });

})