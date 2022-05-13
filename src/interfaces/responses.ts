export interface IAzureQueueSendResponse {
  isOk: boolean,
  traceRequestId: string,
  status: number,
  messageId: string,
  nextVisibleOn: Date,
  popReceipt: string,
  responseDatetime?: Date,
  sendRequestId: string
}

export interface IAzureQueueReceiveResponse {
  haveMessage: boolean,
  messageText: string,
  messageId: string,
  popReceipt: string,
  dequeueCount: number,
  nextVisibleOn: Date,
  responseDatetime?: Date,
  receiveRequestId?: string
}

export interface IAzureQueueDeleteResponse {
  didDelete: boolean,
  messageId: string,
  errorCode: string,
  status: number,
  responseDatetime?: Date,
  deleteRequestId?: string
}