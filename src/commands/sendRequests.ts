import axios from 'axios';
import { delay } from '../common/misc';
import { Logger } from '../lib/Logger';
import { FunctionRequestMessage } from '../interfaces/queueMessages';

const log = new Logger();

async function sendMessage(requestsUrl: string, postRequestsKey: string): Promise<boolean> {
  const now: Date = new Date();
  const message: FunctionRequestMessage = { 
    apiVersion: '2022-02-12', 
    requesterId: `${now.valueOf()}`,
    messageText: `Hello message ${now.valueOf()}`
  };
  const messageString: string = JSON.stringify(message);

  log.info(`sendMessage | prepared message ${messageString}`);

  const calledTime = new Date();
  const sendResponse = await axios.post(requestsUrl, message, {
    headers: {
      'Content-Type': 'application-json',
      'x-functions-key': postRequestsKey
    }
  });
  const receivedTime = new Date();

  // 200-family = ok
  if (sendResponse.status >= 200 && sendResponse.status < 300) {
    log.ok(`sendMessage\n   | function called at ${calledTime.toISOString()} with messageTest ${message.messageText}\n   | function ran at ${sendResponse.data.requestDatetime} with requestId ${sendResponse.data.requestId}\n   | response received at ${receivedTime.toISOString()}`);
    return true;
  } //else
  log.error(`status ${sendResponse.status} ${sendResponse.statusText}`);
  log.info(
    `sendResponse\n
        status: ${sendResponse.status}\n
        statusText: ${sendResponse.statusText}\n
        headers: ${JSON.stringify(sendResponse.headers)}\n
        config: ${JSON.stringify(sendResponse.config)}\n
        data: ${JSON.stringify(sendResponse.data)}`
  );
  return false;
}

async function sendRequests(messageCount: number): Promise<void> {
  if (messageCount < 1) {
    log.error(`sendRequests | messageCount < 1, using 1`);
    messageCount = 1;
  }

  const requestsUrl = process.env.REQUESTS_URL || '';
  const requestsKey = process.env.REQUESTS_KEY || '';
  if (requestsUrl.length === 0 || requestsKey.length === 0) {
    log.error(`sendRequests | missing environment variable REQUESTS_URL or REQUESTS_KEY or both`);
    return
  }
  

  for (let i = 0; i < messageCount; i++) {
    // random returns a floating point number between 0 and <1
    // multiply by 6 and floor() it to get a number between 0 and 5
    // then add 2 to get 2 to 7 and multiply by 1000 to get ms
    const msDelay = ((Math.floor(Math.random() * 6) + 2) * 1000)
    log.info(`sendRequests | waiting ${msDelay} ms`);
    await delay(msDelay)
    await sendMessage(requestsUrl, requestsKey);
    log.divider();
  }
}

export { sendRequests };