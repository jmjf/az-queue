const { QueueServiceClient } = require('@azure/storage-queue');
const { v4: uuidv4 } = require('uuid');
const { delay, getQueueClientForSend } = require('./utils');
const chalk = require('chalk');

async function sendMessage(queueClient) {
  const now = new Date();
  const messageNumber = now.valueOf();
  const messageString = JSON.stringify(
    { requestId: uuidv4(), 
      requestDatetime: now.toISOString(), 
      messageText: `Hello message ${messageNumber}`
    }
  );

  console.log(chalk.green('sendMessage | prepared message', messageString));

  const enqueueResponse = await queueClient.sendMessage(messageString);
  console.log(chalk.greenBright(`sendMessage sent ${messageNumber} inserted ${enqueueResponse.insertedOn.toISOString()}`));
  console.log(chalk.magentaBright('----------------------------------------------------------------------------------------------------\n'));
}

async function enqueue (queueName) {
  const queueClient = await getQueueClientForSend(queueName);
  if (!queueClient) {
    console.log(chalk.redBright('enqueue | queueClient is falsey'));
    return;
  }
  console.log(chalk.green('enqueue | queueClient is good to go\n'));

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