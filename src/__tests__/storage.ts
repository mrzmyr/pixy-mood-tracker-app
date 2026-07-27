import AsyncStorage from '@react-native-async-storage/async-storage';
import { load, store } from '../helpers/storage';

const TEST_KEY = 'test-key';

describe('Storage', () => {
  it('should `load`', async () => {
    AsyncStorage.getItem = jest.fn().mockReturnValueOnce(Promise.resolve('{"test": "test"}'));
    const result = await load(TEST_KEY);
    expect(result).toEqual({ test: 'test' });
  });

  it('should `load` with null', async () => {
    AsyncStorage.getItem = jest.fn().mockResolvedValueOnce(null);
    const result = await load(TEST_KEY);
    expect(result).toEqual(null);
  })

  it('should reject malformed data', async () => {
    AsyncStorage.getItem = jest.fn().mockResolvedValueOnce('not-json');
    await expect(load(TEST_KEY)).rejects.toBeInstanceOf(SyntaxError);
  })

  it('should reject storage read errors', async () => {
    const error = new Error('storage unavailable');
    AsyncStorage.getItem = jest.fn().mockRejectedValueOnce(error);
    await expect(load(TEST_KEY)).rejects.toBe(error);
  })

  it('should `store`', async () => {
    AsyncStorage.setItem = jest.fn(() => Promise.resolve());
    await store(TEST_KEY, { foo: '123' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(TEST_KEY, '{"foo":"123"}');
  })

})
