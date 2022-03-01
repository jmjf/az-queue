import { QueueClient } from '@azure/storage-queue';
import { QueueDemoError} from '../src/lib/QueueDemoErrors';
import { IProcessEnv } from '../src/lib/ProcessEnv';
import { getQueueClientForReceive, getQueueClientForSend } from '../src/lib/queueClientFactories';

// I just need a dang QueueClient so I can mock the exists() method
const qc = new QueueClient('DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=accountKey;EndpointSuffix=core.windows.net','queue');

// mock getQueueClient -- must require so we can reassign getQueueClient
jest.mock('../src/lib/getQueueClient');
let gqc = require('../src/lib/getQueueClient');

describe('getQueueClientForReceive()', () => {

  test('should return a QueueClient if queue exists', async () => {
    // for this test, we want exists() to return true
    qc.exists = jest.fn().mockResolvedValue(true);
    gqc.getQueueClient = jest.fn().mockReturnValue(qc);

    const env = <IProcessEnv>{}; // mocked getQueueClient() so env doesn't matter

    const res = await getQueueClientForReceive('queue', env);

    expect(res instanceof QueueClient).toBe(true);
  });

  test('should throw QDResourceError if queue does not exist', async () => {
    // for this test, we want exists() to return false
    qc.exists = jest.fn().mockResolvedValue(false);
    gqc.getQueueClient = jest.fn().mockReturnValue(qc);

    const env = <IProcessEnv>{}; // mocked getQueueClient() so env doesn't matter

    // it's an async function so this is how we test for exceptions
    expect.assertions(1);
    try {
      await getQueueClientForReceive('queue', env);
    } catch(e) {
      // without this "cast" we get an error from the expect
      const qde = <QueueDemoError><unknown>e;
      expect(qde.name).toMatch('QDResourceError');
    }
  });
});

describe('getQueueClientForSend()', () => {

  test('should return a QueueClient if queue exists', async () => {
    // for this test, we want exists() to return true
    qc.exists = jest.fn().mockResolvedValue(true);
    gqc.getQueueClient = jest.fn().mockReturnValue(qc);

    const env = <IProcessEnv>{}; // mocked getQueueClient() so env doesn't matter

    const res = await getQueueClientForSend('queue', env);

    expect(res instanceof QueueClient).toBe(true);
  });

  test('should return a QueueClient if create succeeds', async () => {
    // for this test, we want exists() to return true
    qc.exists = jest.fn().mockResolvedValue(true);
    qc.createIfNotExists = jest.fn().mockResolvedValue({_response: {status: 201}});
    gqc.getQueueClient = jest.fn().mockReturnValue(qc);

    const env = <IProcessEnv>{}; // mocked getQueueClient() so env doesn't matter

    const res = await getQueueClientForSend('queue', env);

    expect(res instanceof QueueClient).toBe(true);
  });

  test('should throw QDResourceError if queue does not exist and create fails', async () => {
    // for this test, we want exists() to return false
    qc.exists = jest.fn().mockResolvedValue(false);
    qc.createIfNotExists = jest.fn().mockResolvedValue({_response: {status: 409}});
    gqc.getQueueClient = jest.fn().mockReturnValue(qc);

    const env = <IProcessEnv>{}; // mocked getQueueClient() so env doesn't matter

    // it's an async function so this is how we test for exceptions
    expect.assertions(1);
    try {
      await getQueueClientForSend('queue', env);
    } catch(e) {
      // without this "cast" we get an error from the expect
      const qde = <QueueDemoError><unknown>e;
      expect(qde.name).toMatch('QDResourceError');
    }
  });
});