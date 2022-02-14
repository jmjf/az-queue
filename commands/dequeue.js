const { QueueServiceClient } = require('@azure/storage-queue');
const { delay, getQueueClientForReceive, getTimeout } = require('./utils');
const chalk = require('chalk');

async function receiveMessage(queueClient) {
  const response = await queueClient.receiveMessages();
  if (response.receivedMessageItems.length == 1) {
    const messageItem = response.receivedMessageItems[0];
    const message = JSON.parse(messageItem.messageText);

    console.log(chalk.greenBright(`receiveMessage | received messageId ${messageItem.messageId}`));
    console.log(chalk.green(messageItem.messageText, '\n'));
    return messageItem;
  }
  console.log(chalk.yellow('receivedMessage | no messages'));
  return false;
}

async function deleteMessage(queueClient, messageId, popReceipt) {
  const deleteResponse = await queueClient.deleteMessage(messageId, popReceipt);
  if (deleteResponse && typeof deleteResponse.errorCode == 'undefined') {
    console.log(chalk.yellowBright(`deleteMessage | deleted ${messageId} on ${deleteResponse.date}\n`));
  } else {
    console.log(chalk.redBright(`deleteMessage | response for ${messageId} -> ${(deleteResponse) ? deleteResponse.errorCode : 'is falsey'}`));
  }
}

async function dequeue (queueName) {
  const queueClient = await getQueueClientForReceive(queueName);
  if (!queueClient) {
    console.log(chalk.redBright('dequeue | queueClient is falsey'));
    return;
  }
  console.log(chalk.green('dequeue | queueClient is good to go\n'));

  // loop forever reading the queue
  let timeout = 0;
  while (true) {
    const messageItem = await receiveMessage(queueClient);
    if (messageItem) {
      deleteMessage(queueClient, messageItem.messageId, messageItem.popReceipt);
      timeout = 0;
    } else {
      timeout = getTimeout(timeout);
      console.log(chalk.yellowBright(`dequeue | no message received, waiting ${timeout} ms`));
      await delay(timeout);
      console.log(chalk.cyan('---------------------------------------------------\n'));
    }
  }
}

module.exports = { dequeue }