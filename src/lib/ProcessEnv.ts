interface IProcessEnv {
  ACCOUNT_URI: string,
  AUTH_METHOD: string,
  ACCOUNT_NAME?: string,
  ACCOUNT_KEY?: string,
  STORAGE_CONNECTION_STRING?: string,
  ACCOUNT_SAS?: string,
  AZURE_TENANT_ID?: string,
  AZURE_CLIENT_ID?: string,
  AZURE_CLIENT_SECRET?: string,
  HTTP_PROXY?: string
  MAX_TIMEOUT: string,
  TIMEOUT_INCREMENT: string
  RECEIVED_QUEUE_NAME: string,
  PREPARED_QUEUE_NAME: string,
  STATUS_QUEUE_NAME: string,
  REQUESTS_URL: string,
  REQUESTS_KEY: string,
}

export { IProcessEnv };