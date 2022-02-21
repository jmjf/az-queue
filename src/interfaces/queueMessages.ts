interface RequestMessage {
  requestId: string,
  requestDatetime: string,
  messageText: string
}

interface ResendMessage {
  interfaceVersion: string,
  relayDatetime: string,
  messageText: string
}

interface FunctionRequestMessage {
  apiVersion: string,
  requesterId: string,
  messageText: string
}

export {
  RequestMessage,
  ResendMessage,
  FunctionRequestMessage
};