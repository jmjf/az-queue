import postRequests from './index';
import { getDefaultContext } from '../testUtils';
import { supportedApiVersions } from '../supportedApiVersions';

test('postRequests should return 200 for good request', async () => {
  const context = getDefaultContext();
  const request = {
    body: {
      apiVersion: supportedApiVersions[0],
      requesterId: 'test123',
      messageText: 'test message'
    }
  };

  await postRequests(context, request);

  expect(context.res?.status).toBe(200);
  expect(context.res?.body.requesterId).toMatch(request.body.requesterId);
  expect(context.res?.body.messageText).toMatch(request.body.messageText);
});

test('postRequests should return 400 for missing request body', async () => {
  const context = getDefaultContext();
  const request = {};

  await postRequests(context, request);

  expect(context.res?.status).toBe(400);
});

test('postRequests should return 400 for apiVersion missing', async () => {
  const context = getDefaultContext();
  const request = {
    body: {
      requesterId: 'test123',
      messageText: 'test message'
    }
  };

  await postRequests(context, request);

  expect(context.res?.status).toBe(400);
});

test('postRequests should return 400 for unsupported apiVersion', async () => {
  const context = getDefaultContext();
  const request = {
    body: {
      apiVersion: '1900-01-01',
      requesterId: 'test123',
      messageText: 'test message'
    }
  };

  await postRequests(context, request);

  expect(context.res?.status).toBe(400);
});

test('postRequests should return 400 for requesterId missing', async () => {
  const context = getDefaultContext();
  const request = {
    body: {
      apiVersion: supportedApiVersions[0],
      messageText: 'test message'
    }
  };

  await postRequests(context, request);

  expect(context.res?.status).toBe(400);
});

test('postRequests should return 400 for requesterId empty', async () => {
  const context = getDefaultContext();
  const request = {
    body: {
      apiVersion: supportedApiVersions[0],
      requesterId: '',
      messageText: 'test message'
    }
  };

  await postRequests(context, request);

  expect(context.res?.status).toBe(400);
});

test('postRequests should return 400 for requesterId not string', async () => {
  const context = getDefaultContext();
  const request = {
    body: {
      apiVersion: supportedApiVersions[0],
      requesterId: 1,
      messageText: 'test message'
    }
  };

  await postRequests(context, request);

  expect(context.res?.status).toBe(400);
});

test('postRequests should return 400 for messageText missing', async () => {
  const context = getDefaultContext();
  const request = {
    body: {
      apiVersion: supportedApiVersions[0],
      requesterId: 'test123',
    }
  };

  await postRequests(context, request);

  expect(context.res?.status).toBe(400);
});

test('postRequests should return 400 for messageText empty', async () => {
  const context = getDefaultContext();
  const request = {
    body: {
      apiVersion: supportedApiVersions[0],
      requesterId: 'test123',
      messageText: ''
    }
  };

  await postRequests(context, request);

  expect(context.res?.status).toBe(400);
});

test('postRequests should return 400 for messageText not string', async () => {
  const context = getDefaultContext();
  const request = {
    body: {
      apiVersion: supportedApiVersions[0],
      requesterId: 'test123',
      messageText: 1
    }
  };

  await postRequests(context, request);

  expect(context.res?.status).toBe(400);
});