export interface RequestMessage {
  requestId: string,
  requestDatetime: string,
  messageText: string
}

export interface PreparedMessage {
  apiVersion: string,
  requestId: string,
  preparedDatetime: string,
  messageText: string
}

export interface FunctionRequestMessage {
  apiVersion: string,
  requesterId: string,
  messageText: string
}

export interface StatusMessage {
  apiVersion: string,
  requestId: string,
  statusDatetime: string,
  statusCode: string,
  statusText: string
}