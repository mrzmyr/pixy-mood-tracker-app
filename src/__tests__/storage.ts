import AsyncStorage from '@react-native-async-storage/async-storage';
import { load, store } from '../helpers/storage';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const TEST_KEY = 'test-key';

describe('Storage', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('should `load`', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve('{"test": "test"}'));
    const result = await load(TEST_KEY);
    expect(result).toEqual({ test: 'test' });
  });

  it('should `load` with null', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve(null));
    const result = await load(TEST_KEY);
    expect(result).toEqual(null);
  })

  it('should throw when reading fails instead of returning null', async () => {
    const error = new Error('disk error');
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.reject(error));
    await expect(load(TEST_KEY)).rejects.toThrow('disk error');
    expect(consoleError).toHaveBeenCalledWith(error);
  })

  it('should throw when data is corrupt instead of returning null', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve('{"items": [truncated'));
    await expect(load(TEST_KEY)).rejects.toThrow();
    expect(consoleError).toHaveBeenCalledTimes(1);
  })

  it('should throw when data is an empty string instead of returning null', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve(''));
    await expect(load(TEST_KEY)).rejects.toThrow();
    expect(consoleError).toHaveBeenCalledTimes(1);
  })

  it('should `store`', async () => {
    AsyncStorage.setItem = jest.fn(() => Promise.resolve());
    await store(TEST_KEY, { foo: '123' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(TEST_KEY, '{"foo":"123"}');
  })

})
