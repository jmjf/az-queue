export class QueueDemoError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

export class QDEnvironmentError extends QueueDemoError {
  constructor(message: string) {
    super('QDEnvironmentError', message);
  }
}

export class QDResourceError extends QueueDemoError {
  constructor(message: string) {
    super('QDResourceError', message);
  }
}
export class QDParameterError extends QueueDemoError {
  constructor(message: string) {
    super('QDParameterError', message);
  }
}

export class QDNotReadyError extends QueueDemoError {
  constructor(message: string) {
    super('QDNotReadyError', message);
  }
}