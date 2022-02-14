#! /usr/bin/env node

// Based on examples from https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/storage-queue/samples/v12/javascript

const { sender } = require('./commands/sender');
const { reader } = require('./commands/reader');
const { resender } = require('./commands/resender');

const { program } = require('commander');

async function main() {
  program
    .name('azure-queue-demo')
    .description('demonstates sending and receiving messages with Azure Storage Queues')
    .version('0.1.0');

  program
    .command('sender')
    .description('Generate messages and send them to an Azure queue')
    .argument('<queueName>', 'name of queue to send messages to')
    .action((queueName) => { sender(queueName) });

  program
    .command('reader')
    .description('Read messages from an Azure queue and delete them from the queue')
    .argument('<queueName>', 'name of the queue to read messages from')
    .action((queueName) => { reader(queueName) });

  program
    .command('resender')
    .description('Read messages from a queue, send them to another queue and delete them from the source queue')
    .argument('<fromQueueName>', `name of the queue to read messages from`)
    .argument('<toQueueName>', 'name of the queue to send messages to')
    .action((fromQueueName, toQueueName) => resender(fromQueueName, toQueueName));

  await program.parseAsync(process.argv)
}
 
 main().catch((error) => {
   console.error(error);
   process.exit(1);
 });
 
 module.exports = { main };
 