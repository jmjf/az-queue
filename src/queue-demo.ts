#! /usr/bin/env node

// Based on examples from https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/storage-queue/samples/v12/javascript

// Load the .env file if it exists
import dotenv from 'dotenv';
dotenv.config({ path: './env/dev.env'});

import { sendRequests } from './commands/sendRequests';
import { readStatuses } from './commands/readStatuses';
import { prepareRequests } from './commands/prepareRequests';
import { log, LogLevels } from './common/logger';

import { program } from 'commander';

async function main() {
  const receivedRequestsQueueName = process.env.RECEIVED_QUEUE_NAME || '';
  const preparedRequestsQueueName = process.env.PREPARED_QUEUE_NAME || '';
  const completedStatusQueueName = process.env.STATUS_QUEUE_NAME || '';
  if ( receivedRequestsQueueName.length < 1 ||
       preparedRequestsQueueName.length < 1 ||
       completedStatusQueueName.length < 1
      ) {
    log(LogLevels.ERROR, `main | missing one or more queue names in environment`);
    return;
  }

  program
    .name('azure-queue-demo')
    .description('demonstates sending and receiving messages with Azure Storage Queues')
    .version('0.1.0');

  program
    .command('send-requests')
    .description('Generate messages and send them to an Azure queue using an Azure function')
    .argument('<messageCount>', 'number of messages to send')
    .action((messageCount) => { sendRequests(messageCount) });

  program
    .command('read-statuses')
    .description('Read messages from an Azure queue and delete them from the queue')
    .argument('<queueName>', 'name of the queue to read messages from')
    .action((queueName:string ) => { readStatuses(completedStatusQueueName) });

  program
    .command('prepare-requests')
    .description('Read messages from the received queue, prepare them, publish to the prepared queue, delete them from the received queue')
    .action(() => { prepareRequests(receivedRequestsQueueName, preparedRequestsQueueName) } );

  await program.parseAsync(process.argv)
}
 
 main().catch((error) => {
   console.error(error);
   process.exit(1);
 });
 
 module.exports = { main };
 