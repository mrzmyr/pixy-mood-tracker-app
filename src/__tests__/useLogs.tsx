import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook } from '@testing-library/react-hooks'
import { AnalyticsProvider } from '../hooks/useAnalytics'
import { LogsProvider, LogsState, STORAGE_KEY, useLogState, useLogUpdater } from '../hooks/useLogs'
import { SettingsProvider } from '../hooks/useSettings'
import { _generateItem } from './utils'

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>{children}</LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
)

const testItems: LogsState['items'] = [
  _generateItem({
    date: '2022-01-01',
    rating: 'neutral',
    message: 'test message',
    tags: []
  }),
  _generateItem({
    date: '2022-01-02',
    rating: 'neutral',
    message: '🦄',
    tags: [{
      id: '1',
    }, {
      id: '2',
    }]
  }),
]

const _renderHook = () => {
  return renderHook(() => ({
    state: useLogState(),
    updater: useLogUpdater()
  }), { wrapper })
}

const _console_error = console.error

describe('useLogs()', () => {

  beforeEach(async () => {
    console.error = jest.fn()
  })

  afterEach(async () => {
    console.error = _console_error
    const keys = await AsyncStorage.getAllKeys()
    await AsyncStorage.multiRemove(keys)
  });

  test('should have `loaded` prop', async () => {
    const hook = _renderHook()
    expect(hook.result.current.state.loaded).toBe(false)

    // run useEffect for loading async storage
    await hook.waitForNextUpdate()

    expect(hook.result.current.state.loaded).toBe(true)
  })

  test('should load `state` from async storage', async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: testItems }))

    const hook = _renderHook()
    await hook.waitForNextUpdate()

    expect(hook.result.current.state.items).toEqual(testItems)
  })

  test('should initiate `state` with empty `items` when async storage is empty', async () => {
    const hook = _renderHook()
    await hook.waitForNextUpdate()
    expect(hook.result.current.state.items).toEqual([])
  })

  test('should initiate `state` with empty `items` when async storage is falsely', async () => {
    AsyncStorage.setItem(STORAGE_KEY, '🐇')
    const hook = _renderHook()
    await hook.waitForNextUpdate()
    expect(console.error).toHaveBeenCalled();
  })

  test('should import', async () => {
    const hook = _renderHook()
    await hook.waitForNextUpdate()

    await act(() => {
      hook.result.current.updater.import({
        items: testItems
      })
    })

    expect(hook.result.current.state.items).toEqual(testItems)
  })

  test('should addLog', async () => {
    const hook = _renderHook()
    await hook.waitForNextUpdate()

    await act(() => {
      hook.result.current.updater.addLog(testItems[0])
    })

    expect(hook.result.current.state.items).toEqual([testItems[0]])
  })

  test('should editLog', async () => {
    const hook = _renderHook()
    await hook.waitForNextUpdate()

    const itemEdited = {
      ...testItems[0],
      message: 'edited message',
      tags: [{
        id: '4',
      }]
    }

    await act(() => hook.result.current.updater.addLog(testItems[0]))
    await act(() => hook.result.current.updater.editLog(itemEdited))

    expect(hook.result.current.state.items).toEqual([itemEdited])
  })

  test('should updateLogs', async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: [] }))

    const hook = _renderHook()
    await hook.waitForNextUpdate()

    const itemsEdited = [
      {
        ...testItems[0],
        message: 'edited message',
        tags: [{
          id: '1',
        }]
      },
      {
        ...testItems[1],
        message: 'edited message 2',
        tags: [{
          id: '1',
        }]
      }
    ]

    expect(hook.result.current.state.items).toEqual([])

    await act(() => hook.result.current.updater.updateLogs(itemsEdited))

    expect(hook.result.current.state.items).toEqual(itemsEdited)
  })

  test('should deleteLog', async () => {
    const hook = _renderHook()
    await hook.waitForNextUpdate()

    await act(() => hook.result.current.updater.addLog(testItems[0]))
    await act(() => hook.result.current.updater.addLog(testItems[1]))
    await act(() => hook.result.current.updater.deleteLog(testItems[0].id))

    expect(hook.result.current.state.items).toEqual([testItems[1]])
  })

  test('should reset', async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: [] }))

    const hook = _renderHook()
    await hook.waitForNextUpdate()

    await act(() => hook.result.current.updater.updateLogs(testItems))
    expect(hook.result.current.state.items).toEqual(testItems)

    await act(() => hook.result.current.updater.reset())
    expect(hook.result.current.state.items).toEqual([])
  })

})