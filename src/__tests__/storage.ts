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
    const result = await load(TEST_KEY);
    expect(result).toEqual(null);
  })

  it('should `store`', async () => {
    AsyncStorage.setItem = jest.fn(() => Promise.resolve());
    await store(TEST_KEY, { foo: '123' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(TEST_KEY, '{"foo":"123"}');
  })

})
    