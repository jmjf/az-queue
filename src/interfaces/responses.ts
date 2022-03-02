export interface IQueueManagerSendResponse {
  isOk: boolean,
  traceRequestId: string,
  status: number,
  messageId: string,
  nextVisibleOn: Date,
  popReceipt: string,
  responseDatetime?: Date,
  sendRequestId: string
}

export interface IQueueManagerReceiveResponse {
  haveMessage: boolean,
  messageText: string,
  messageId: string,
  popReceipt: string,
  dequeueCount: number,
  nextVisibleOn: Date,
  responseDatetime?: Date,
  receiveRequestId?: string
}

export interface IQueueManagerDeleteResponse {
  deleted: boolean,
  deletedMessageId: string,
  errorCode: string,
  status: number,
  responseDatetime?: Date,
  deleteRequestId?: string
}