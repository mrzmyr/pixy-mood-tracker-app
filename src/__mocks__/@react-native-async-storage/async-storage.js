// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest/#using-async-storage-mock
import AsyncStorageMock from "@react-native-async-storage/async-storage/jest/async-storage-mock";

// The upstream mock exposes `jest.fn` methods. `jest.restoreAllMocks()`
// strips their in-memory implementation, so later tests read `undefined` and
// silently write nothing. Plain functions make `jest.spyOn` restore back to
// working storage.
const AsyncStorage = { ...AsyncStorageMock };

for (const key of Object.keys(AsyncStorage)) {
  const method = AsyncStorage[key];
  const implementation = jest.isMockFunction(method)
    ? method.getMockImplementation()
    : undefined;
  if (implementation) {
    AsyncStorage[key] = (...args) => implementation(...args);
  }
}

export default AsyncStorage;
