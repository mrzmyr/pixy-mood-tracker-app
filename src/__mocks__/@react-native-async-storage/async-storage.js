// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest/#using-async-storage-mock
import AsyncStorageMock from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// The upstream mock exposes `jest.fn` methods that call each other.
// `jest.restoreAllMocks()` strips their in-memory implementation, so later
// tests would read `undefined` and silently write nothing. Replacing them with
// plain functions makes `jest.spyOn` restore back to working storage.
Object.keys(AsyncStorageMock).forEach((key) => {
  const method = AsyncStorageMock[key];
  if (!jest.isMockFunction(method)) return;
  const implementation = method.getMockImplementation();
  if (!implementation) return;
  AsyncStorageMock[key] = (...args) => implementation(...args);
});

export default AsyncStorageMock;
