import { Context } from '@azure/functions';

const getDefaultContext = (): Context => { 
  return <Context><unknown> {
    bindings: {},
    done: jest.fn(),
    log: jest.fn()
  };
};

export { getDefaultContext };