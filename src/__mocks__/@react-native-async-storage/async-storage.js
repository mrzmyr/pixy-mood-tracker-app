// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest/#using-async-storage-mock
import AsyncStorageMock from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// The upstream mock exposes `jest.fn` methods that call each other.
// `jest.restoreAllMocks()` strips their in-memory implementation, so later
// tests would read `undefined` and silently write nothing. Replacing them with
// plain functions makes `jest.spyOn` restore back to working storage.
for (const key of Object.keys(AsyncStorageMock)) {
  const method = AsyncStorageMock[key];
  if (!jest.isMockFunction(method)) {
    continue;
  }
  const implementation = method.getMockImplementation();
  if (!implementation) {
    continue;
  }
  AsyncStorageMock[key] = (...args) => implementation(...args);
}

export default AsyncStorageMock;
