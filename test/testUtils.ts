import { IProcessEnv } from '../src/lib/IProcessEnv';

// UUIDs are randomly generated and client secret is a random string I typed and encoded as base64

export function getTestEnv(): IProcessEnv {
  return <IProcessEnv>{
    ACCOUNT_URI: 'http://127.0.0.1:1111/devstoreaccount1',
    AUTH_METHOD: 'authmethod',
    ACCOUNT_NAME: 'account_name',
    ACCOUNT_KEY: 'account_key',
    STORAGE_CONNECTION_STRING: 'connection string not used',
    ACCOUNT_SAS: 'sas not used',
    AZURE_TENANT_ID: '28731a20-745f-4cd2-b99a-ea25851bcf85',
    AZURE_CLIENT_ID: 'bdc1c155-2b03-4867-b688-a4905bf2fd57',
    AZURE_CLIENT_SECRET: 'cTk4NDVuYSAyM1tvXVxbIDM4LTEzcXczbzgyMzc1UVdFUmF2YXc0NQ==',
    HTTP_PROXY: 'proxy not used',
    MAX_TIMEOUT: '30000',
    TIMEOUT_INCREMENT: '200',
    RECEIVED_QUEUE_NAME: 'received-queue',
    PREPARED_QUEUE_NAME: 'prepared-queue',
    STATUS_QUEUE_NAME: 'status-queue',
    REQUESTS_URL: 'function url not used',
    REQUESTS_KEY: 'function key not user'
  }
}