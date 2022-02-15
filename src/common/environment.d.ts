declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ACCOUNT_NAME: string,
      AZURE_TENANT_ID: string,
      AZURE_CLIENT_ID: string,
      AZURE_CLIENT_SECRET: string,
      MAX_TIMEOUT: string,
      TIMEOUT_INCREMENT: string
    }
  }
}

export {}