interface RequestMessage {
  requestId: string,
  requestDatetime: string,
  messageText: string
}

interface PreparedMessage {
  apiVersion: string,
  requestId: string,
  preparedDatetime: string,
  messageText: string
}

interface FunctionRequestMessage {
  apiVersion: string,
  requesterId: string,
  messageText: string
}

interface StatusMessage {
  apiVersion: string,
  requestId: string,
  statusDatetime: string,
  statusCode: string,
  statusText: string
}

export {
  RequestMessage,
  PreparedMessage,
  FunctionRequestMessage,
  StatusMessage
};