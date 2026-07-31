import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { load, store } from '../helpers/storage';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const TEST_KEY = 'test-key';

describe('Storage', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
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
    await expect(load(TEST_KEY)).rejects.toMatchObject({
      status: 'storage_read_failed',
      message: 'Stored data could not be read',
      why: `Reading storage key "${TEST_KEY}" failed: disk error`,
      fix: 'Retry the operation and check device storage access',
    });
  })

  it('should throw when data is corrupt instead of returning null', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve('{"items": [truncated'));
    await expect(load(TEST_KEY)).rejects.toThrow();
    expect(consoleError).toHaveBeenCalledTimes(1);
  })

  it('should throw when data is an empty string instead of returning null', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve(''));
    await expect(load(TEST_KEY)).rejects.toMatchObject({
      status: 'storage_invalid_value',
      message: 'Stored data is invalid',
      why: `Storage key "${TEST_KEY}" could not be parsed: Unexpected end of JSON input`,
      fix: 'Restore valid JSON data or remove the corrupted storage entry',
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
  })

  it('should reject persisted JSON null instead of treating it as a missing key', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve('null'));

    await expect(load(TEST_KEY)).rejects.toMatchObject({
      status: 'storage_invalid_value',
      message: 'Stored data is invalid',
      why: `Storage key "${TEST_KEY}" contains JSON null`,
      fix: 'Restore valid JSON data or remove the corrupted storage entry',
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
  })

  it('should `store`', async () => {
    AsyncStorage.setItem = jest.fn(() => Promise.resolve());
    await store(TEST_KEY, { foo: '123' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(TEST_KEY, '{"foo":"123"}');
  })

  it('should report storage write failures', async () => {
    AsyncStorage.setItem = jest.fn(() => Promise.reject(new Error('disk full')));

    await store(TEST_KEY, { foo: '123' });

    expect(Sentry.captureException).toHaveBeenCalledWith(expect.objectContaining({
      status: 'storage_write_failed',
      message: 'Stored data could not be saved',
      why: `Writing storage key "${TEST_KEY}" failed: disk full`,
      fix: 'Retry the operation and check available device storage',
    }));
  })

})
