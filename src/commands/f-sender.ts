import axios from 'axios';
import { delay } from '../common/misc';
import * as logger from '../common/logger';
import { FunctionRequestMessage } from '../interfaces/queueMessages';

import dotenv from 'dotenv';
dotenv.config({ path: './env/dev.env'});

async function sendMessage(postRequestsUrl: string, postRequestsKey: string): Promise<boolean> {
  const now: Date = new Date();
  const message: FunctionRequestMessage = { 
    apiVersion: '2022-02-12', 
    requesterId: `${now.valueOf()}`,
    messageText: `Hello message ${now.valueOf()}`
  };
  const messageString: string = JSON.stringify(message);

  logger.log(logger.LogLevels.INFO, `sendMessage | prepared message ${messageString}`);

  const calledTime = new Date();
  const sendResponse = await axios.post(postRequestsUrl, message, {
    headers: {
      'Content-Type': 'application-json',
      'x-functions-key': postRequestsKey
    }
  });
  const receivedTime = new Date();

  // 200-family = ok
  if (sendResponse.status >= 200 && sendResponse.status < 300) {
    logger.log(logger.LogLevels.OK, `sendMessage\n   | function called at ${calledTime.toISOString()} with messageTest ${message.messageText}\n   | function ran at ${sendResponse.data.requestDatetime} with requestId ${sendResponse.data.requestId}\n   | response received at ${receivedTime.toISOString()}`);
    return true;
  } //else
  logger.log(logger.LogLevels.ERROR, `status ${sendResponse.status} ${sendResponse.statusText}`);
  logger.log(logger.LogLevels.INFO, 
    `sendResponse\n
        status: ${sendResponse.status}\n
        statusText: ${sendResponse.statusText}\n
        headers: ${JSON.stringify(sendResponse.headers)}\n
        config: ${JSON.stringify(sendResponse.config)}\n
        data: ${JSON.stringify(sendResponse.data)}`
  );
  return false;
}

async function fSender(messageCount: number): Promise<void> {
  if (messageCount < 1) {
    logger.log(logger.LogLevels.ERROR, `fSender | messageCount < 1, using 1`);
    messageCount = 1;
  }

  const postRequestsUrl = process.env.POST_REQUESTS_URL || '';
  const postRequestsKey = process.env.POST_REQUESTS_KEY || '';
  if (postRequestsUrl.length === 0 || postRequestsKey.length === 0) {
    logger.log(logger.LogLevels.ERROR, 'fSender | missing environment variable POST_REQUESTS_URL or POST_REQUESTS_KEY or both');
    return
  }
  

  for (let i = 0; i < messageCount; i++) {
    // random returns a floating point number between 0 and <1
    // multiply by 6 and floor() it to get a number between 0 and 5
    // then add 2 to get 2 to 7 and multiply by 1000 to get ms
    const msDelay = ((Math.floor(Math.random() * 6) + 2) * 1000)
    logger.log(logger.LogLevels.INFO, `fSender | waiting ${msDelay} ms`);
    await delay(msDelay)
    await sendMessage(postRequestsUrl, postRequestsKey);
    logger.log(logger.LogLevels.DIVIDER);
  }
}

export { fSender };