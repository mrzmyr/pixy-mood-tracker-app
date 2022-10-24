import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-hooks";
import _ from "lodash";
import { LogsState } from "../hooks/useLogs";
import { useLogStore } from "../hooks/useLogsStore";

const testItems: LogsState['items'] = {
  '2022-01-01': {
    date: '2022-01-01',
    rating: 'neutral',
    message: 'test message',
    tags: []
  },
  '2022-01-02': {
    date: '2022-01-02',
    rating: 'neutral',
    message: '🦄',
    tags: [{
      id: '1',
      title: 'test tag',
      color: 'lime'
    }, {
      id: '2',
      title: 'test tag 2',
      color: 'slate'
    }]
  }
}

const _renderHook = () => {
  return renderHook(() => useLogStore())
}

describe('useLogStore()', () => {

  beforeEach(async () => {
    jest.restoreAllMocks();
    useLogStore.setState({
      items: {},
    })
  })

  test('should set `_hasHydrated` on hydration', async () => {
    const hook = _renderHook()

    expect(hook.result.current._hasHydrated).toBe(true)
  })

  test('should load `state` from async storage (if not migrated)', async () => {
    AsyncStorage.getItem = jest.fn().mockImplementation((key) => {
      if (key === 'PIXEL_TRACKER_LOGS') {
        return Promise.resolve(JSON.stringify({
          items: testItems
        }))
      }
      return Promise.resolve(undefined)
    })

    await useLogStore.persist.rehydrate()

    const hook = _renderHook()

    expect(hook.result.current.items).toEqual(testItems)
  })

  test('should load `state` from zustand (if migrated)', async () => {
    AsyncStorage.getItem = jest.fn().mockImplementation((key) => {
      if (key === 'PIXEL_TRACKER_LOGS_ZUSTAND') {
        return Promise.resolve(JSON.stringify({
          version: 0,
          state: {
            items: testItems
          }
        }))
      }
      return Promise.resolve(undefined)
    })

    await useLogStore.persist.rehydrate()

    const hook = _renderHook()

    expect(hook.result.current.items).toEqual(testItems)
  })

  test('should initiate `state` with empty `items` when async storage is empty', async () => {
    const hook = _renderHook()
    expect(hook.result.current.items).toEqual({})
  })

  test('should initiate `state` with empty `items` when async storage is falsely', async () => {
    AsyncStorage.getItem = jest.fn().mockResolvedValue('🦄')

    await useLogStore.persist.rehydrate()

    const hook = _renderHook()

    expect(hook.result.current.items).toEqual({})
  })

  test('should addLog', async () => {
    const hook = _renderHook()

    const itemsArr = Object.values(testItems)

    await act(() => {
      hook.result.current.addLog(itemsArr[0])
    })

    expect(hook.result.current.items)
      .toEqual({
        [itemsArr[0].date]: itemsArr[0]
      })
  })

  test('should editLog', async () => {
    const hook = _renderHook()

    const itemsArr = Object.values(testItems)
    const itemEdited = {
      ...itemsArr[0],
      message: 'edited message 🧡',
      tags: [{
        id: '4',
        title: 'tag title',
        color: 'lime'
      }]
    }

    expect(hook.result.current.items).toEqual({})

    await act(() => hook.result.current.addLog(itemsArr[0]))
    await act(() => hook.result.current.editLog(itemEdited))

    expect(hook.result.current.items).toEqual({
      [itemsArr[0].date]: itemEdited
    })

  })

  test('should updateLogs', async () => {
    const hook = _renderHook()

    const itemsArr = Object.values(testItems)
    const itemsEdited = {
      [itemsArr[0].date]: {
        ...itemsArr[0],
        message: 'edited message',
        tags: [{
          id: '1',
          title: 'tag title',
          color: 'lime'
        }]
      },
      [itemsArr[1].date]: {
        ...itemsArr[1],
        message: 'edited message 2',
        tags: [{
          id: '1',
          title: 'tag title',
          color: 'slate',
        }]
      }
    }

    expect(hook.result.current.items).toEqual({})

    await act(() => hook.result.current.updateLogs(itemsEdited))

    expect(hook.result.current.items).toEqual(itemsEdited)
  })

  test('should deleteLog', async () => {
    const hook = _renderHook()

    expect(hook.result.current.items).toEqual({})

    const itemsArr = Object.values(testItems)

    await act(() => hook.result.current.addLog(itemsArr[0]))
    await act(() => hook.result.current.addLog(itemsArr[1]))
    await act(() => hook.result.current.deleteLog(itemsArr[0]))

    expect(hook.result.current.items).toEqual({
      [itemsArr[1].date]: itemsArr[1]
    })
  })

  test('should reset', async () => {
    AsyncStorage.getItem = jest.fn().mockImplementation((key) => {
      if (key === 'PIXEL_TRACKER_LOGS_ZUSTAND') {
        return Promise.resolve(JSON.stringify({
          version: 0,
          state: {
            items: testItems
          }
        }))
      }
      return Promise.resolve(undefined)
    })
    await useLogStore.persist.rehydrate()

    const hook = _renderHook()

    expect(hook.result.current.items).toEqual(testItems)

    await act(() => hook.result.current.reset())

    expect(hook.result.current.items).toEqual({})
  })

})