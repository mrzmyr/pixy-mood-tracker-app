import { act } from '@testing-library/react-native'
const actualCreate = jest.requireActual('zustand')

import { StateCreator } from 'zustand'
const storeResetFns = new Set<() => void>()

const create =
  () =>
    <S,>(createState: StateCreator<S>) => {
      const store = actualCreate.default(createState)
      const initialState = store.getState()
      storeResetFns.add(() => store.setState(initialState, true))
      return store
    }
// Reset all stores after each test run
beforeEach(() => {
  act(() => storeResetFns.forEach((resetFn) => resetFn()))
})
export default create