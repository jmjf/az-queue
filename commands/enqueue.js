const { QueueServiceClient } = require('@azure/storage-queue');
const { v4: uuidv4 } = require('uuid');
const { delay, getQueueClientForSend } = require('../utils');
const { logger } = require('../logger');

async function sendMessage(queueClient) {
  const now = new Date();
  const messageNumber = now.valueOf();
  const messageString = JSON.stringify(
    { requestId: uuidv4(), 
      requestDatetime: now.toISOString(), 
      messageText: `Hello message ${messageNumber}`
    }
  );

  logger.log(logger.logLevels.INFO, `sendMessage | prepared message ${messageString}`);

  const enqueueResponse = await queueClient.sendMessage(messageString);
  logger.log(logger.logLevels.OK, `sendMessage | sent ${messageNumber} inserted ${enqueueResponse.insertedOn.toISOString()}`);
  logger.log(logger.logLevels.DIVIDER);
}

async function enqueue (queueName) {
  const queueClient = await getQueueClientForSend(queueName);
  if (!queueClient) {
    logger.log(logger.logLevels.ERROR, 'enqueue | queueClient is falsey');
    return;
  }
  logger.log(logger.logLevels.INFO, 'enqueue | queueClient is good to go\n');

  for (i = 0; i < 3; i++) {
    // random returns a floating point number between 0 and <1
    // multiply by 6 and floor() it to get a number between 0 and 5
    // then add 2 to get 2 to 7 and multiply by 1000 to get ms
    const msDelay = ((Math.floor(Math.random() * 6) + 2) * 1000)
    await delay(msDelay)
    await sendMessage(queueClient);
  }
}

module.exports = { enqueue }