#! /usr/bin/env node

// Based on examples from https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/storage-queue/samples/v12/javascript

import { sender } from './commands/sender';
import { fSender } from './commands/f-sender';
import { reader } from './commands/reader';
import { resender } from './commands/resender';

import { program } from 'commander';

async function main() {
  program
    .name('azure-queue-demo')
    .description('demonstates sending and receiving messages with Azure Storage Queues')
    .version('0.1.0');

  program
    .command('sender')
    .description('Generate messages and send them to an Azure queue')
    .argument('<queueName>', 'name of queue to send messages to')
    .action((queueName:string) => { sender(queueName) });

  program
    .command('fsender')
    .description('Generate messages and send them to an Azure queue using an Azure function')
    .argument('<messageCount>', 'number of messages to send')
    .action((messageCount) => { fSender(messageCount) });

  program
    .command('reader')
    .description('Read messages from an Azure queue and delete them from the queue')
    .argument('<queueName>', 'name of the queue to read messages from')
    .action((queueName:string ) => { reader(queueName) });

  program
    .command('resender')
    .description('Read messages from a queue, send them to another queue and delete them from the source queue')
    .argument('<fromQueueName>', `name of the queue to read messages from`)
    .argument('<toQueueName>', 'name of the queue to send messages to')
    .action((fromQueueName: string, toQueueName: string) => resender(fromQueueName, toQueueName));

  await program.parseAsync(process.argv)
}
 
 main().catch((error) => {
   console.error(error);
   process.exit(1);
 });
 
 module.exports = { main };
 