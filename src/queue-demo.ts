#! /usr/bin/env node

// Based on examples from https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/storage-queue/samples/v12/javascript

// Load the .env file if it exists
import dotenv from 'dotenv';

import { sendRequests } from './commands/sendRequests';
import { readStatuses } from './commands/readStatuses';
import { prepareRequests } from './commands/prepareRequests';
import { Logger } from './lib/Logger';

import { program } from 'commander';

export async function main() {
  const log = new Logger();
  if (!process.env.APP_ENV) {
    log.error(`main | APP_ENV is falsey`);
    return;
  }
  
  log.info(`main | APP_ENV ${process.env.APP_ENV}`);
  dotenv.config({ path: `./env/${process.env.APP_ENV}.env`});

  if (!process.env.ACCOUNT_URI || process.env.ACCOUNT_URI.length === 0) {
    log.error(`ACCOUNT_URI is falsey or empty`);
    return;
  }
  
  const receivedQueueName = process.env.RECEIVED_QUEUE_NAME || '';
  const preparedQueueName = process.env.PREPARED_QUEUE_NAME || '';
  const statusQueueName = process.env.STATUS_QUEUE_NAME || '';
  if ( receivedQueueName.length < 1 ||
       preparedQueueName.length < 1 ||
       statusQueueName.length < 1
      ) {
    log.error(`main | missing one or more queue names in environment`);
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
    .action((messageCount) => { sendRequests(messageCount, process.env) });

  program
    .command('read-statuses')
    .description('Read messages from an Azure queue and delete them from the queue')
    .action(() => { readStatuses(statusQueueName, process.env) });

  program
    .command('prepare-requests')
    .description('Read messages from the received queue, prepare them, publish to the prepared queue, delete them from the received queue')
    .action(() => { prepareRequests(receivedQueueName, preparedQueueName, process.env) } );

  await program.parseAsync(process.argv)
}
 
 main().catch((error) => {
   console.error(error);
   process.exit(1);
 });
 