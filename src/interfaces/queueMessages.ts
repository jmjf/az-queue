interface RequestMessage {
  requestId: string,
  requestDatetime: string,
  messageText: string
}

interface PreparedMessage {
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
  PreparedMessage,
  FunctionRequestMessage
};