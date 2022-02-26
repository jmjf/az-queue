import processRequests from './index';
import { getDefaultContext } from '../__testUtils/getDefaultContext';
import { preparedApiVersions, statusApiVersions } from '../supportedApiVersions';

test('processRequests should return OK for good request', async () => {
  const context = getDefaultContext();
  const message = {
      apiVersion: preparedApiVersions[0],
      requestId: '82d7db4f-ad53-4b7d-99ad-52095793a905',
      preparedDatetime: (new Date().toISOString()),
      messageText: 'test message'
    };

  await processRequests(context, message);

  expect(context.bindings.statusItem).toBeTruthy(); // it exists
  expect(context.bindings.statusItem.apiVersion).toBe(statusApiVersions[1]);
  expect(context.bindings.statusItem.statusCode).toMatch('OK');
  expect(context.bindings.statusItem.requestId).toMatch(message.requestId);

});

test('processRequests should return error for invalid apiVersion', async () => {
  const context = getDefaultContext();
  const message = {
      apiVersion: '',
      requestId: '82d7db4f-ad53-4b7d-99ad-52095793a905',
      preparedDatetime: (new Date().toISOString()),
      messageText: 'test message'
    };

  await processRequests(context, message);

  expect(context.bindings.statusItem).toBeTruthy(); // it exists
  expect(context.bindings.statusItem.apiVersion).toBe(statusApiVersions[1]);
  expect(context.bindings.statusItem.statusCode).toMatch('ERROR');
  expect(context.bindings.statusItem.requestId).toMatch(message.requestId);
});