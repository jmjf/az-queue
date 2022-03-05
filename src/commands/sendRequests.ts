import axios from 'axios';
import { Logger } from '../lib/Logger';
import { FunctionRequestMessage } from '../interfaces/queueMessages';
import { IProcessEnv } from '../lib/IProcessEnv';

const log = new Logger();
const moduleName = 'sendRequests';

async function delay(ms: number): Promise<void> { 
  return new Promise(res => setTimeout(res, ms));
}

async function postMessage(requestsUrl: string, postRequestsKey: string): Promise<boolean> {
  const fnName = `${moduleName}.postMessage`;
  const now: Date = new Date();
  const message: FunctionRequestMessage = { 
    apiVersion: '2022-02-12', 
    requesterId: `${now.valueOf()}`,
    messageText: `Hello message ${now.valueOf()}`
  };
  const messageString: string = JSON.stringify(message);

  log.info(`${fnName} | prepared message ${messageString}`);

  const calledTime = new Date();
  const sendResponse = await axios.post(requestsUrl, message, {
    headers: {
      'Content-Type': 'application-json',
      'x-functions-key': postRequestsKey
    }
  });
  const receivedTime = new Date();

  // 200-family = ok
  if (sendResponse.status >= 200 && sendResponse.status <= 299) {
    log.ok(`${fnName}\n   | api called ${calledTime.toISOString()} with ${message.messageText}\n   | response received ${receivedTime.toISOString()}\n   | duration ${receivedTime.valueOf() - calledTime.valueOf()} ms | requestId ${sendResponse.data.requestId}`);
    return true;
  } //else
  log.error(`${fnName} | status ${sendResponse.status} ${sendResponse.statusText}`);
  log.info(
    `${fnName} | status ${sendResponse.status} ${sendResponse.statusText}\n
        headers ${JSON.stringify(sendResponse.headers)}\n
        config ${JSON.stringify(sendResponse.config)}\n
        data ${JSON.stringify(sendResponse.data)}`
  );
  return false;
}

export async function sendRequests(messageCount: number, env: IProcessEnv): Promise<void> {
  const fnName = `${moduleName}.sendRequests`;

  if (messageCount < 1) {
    log.error(`${fnName} | messageCount < 1, using 1`);
    messageCount = 1;
  }

  const requestsUrl = env.REQUESTS_URL || '';
  const requestsKey = env.REQUESTS_KEY || '';
  if (requestsUrl.length === 0 || requestsKey.length === 0) {
    log.error(`${fnName} | missing environment variable REQUESTS_URL or REQUESTS_KEY or both`);
    return
  }
  

  for (let i = 0; i < messageCount; i++) {
    // random returns a floating point number between 0 and <1
    // multiply by 9 and floor() it to get a number between 0 and 8
    // then add 2 to get 2 to 10 and multiply by 1000 to get ms
    const msDelay = ((Math.floor(Math.random() * 9) + 2) * 1000)
    log.info(`${fnName} | waiting ${msDelay} ms`);
    await delay(msDelay)
    await postMessage(requestsUrl, requestsKey);
    log.divider();
  }
}