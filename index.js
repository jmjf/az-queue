#! /usr/bin/env node

// Based on examples from https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/storage-queue/samples/v12/javascript

const { enqueue } = require('./commands/enqueue');

const { program } = require('commander');

async function main() {
  program
    .name('azure-queue-demo')
    .description('demonstates sending and receiving messages with Azure Storage Queues')
    .version('0.1.0');

  program
    .command('enqueue')
    .description('Generate messages and enqueue them to an Azure queue')
    .argument('<queueName>', 'name of queue to send messages to')
    .action((queueName) => { enqueue(queueName) });

  await program.parseAsync(process.argv)
}
 
 main().catch((error) => {
   console.error(error);
   process.exit(1);
 });
 
 module.exports = { main };
 