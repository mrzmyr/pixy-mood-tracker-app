import AsyncStorage from '@react-native-async-storage/async-storage';
import { load, store } from '../helpers/storage';

jest.mock('sentry-expo', () => ({
  Native: {
    captureException: jest.fn(),
  },
}));

const TEST_KEY = 'test-key';

describe('Storage', () => {
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
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.reject(new Error('disk error')));
    await expect(load(TEST_KEY)).rejects.toThrow('disk error');
  })

  it('should throw when data is corrupt instead of returning null', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve('{"items": [truncated'));
    await expect(load(TEST_KEY)).rejects.toThrow();
  })

  it('should throw when data is an empty string instead of returning null', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve(''));
    await expect(load(TEST_KEY)).rejects.toThrow();
  })

  it('should `store`', async () => {
    AsyncStorage.setItem = jest.fn(() => Promise.resolve());
    await store(TEST_KEY, { foo: '123' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(TEST_KEY, '{"foo":"123"}');
  })

})
