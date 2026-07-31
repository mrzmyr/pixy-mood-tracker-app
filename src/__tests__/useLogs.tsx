import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { AnalyticsProvider } from '../hooks/useAnalytics'
import { LogsProvider, LogsState, STORAGE_KEY, useLogState, useLogUpdater } from '../hooks/useLogs'
import { SettingsProvider } from '../hooks/useSettings'
import { _generateItem } from './utils'

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}))

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

const waitForLoaded = (hook) => waitFor(() => {
  expect(hook.result.current.state.loaded).toBe(true)
})

const _console_error = console.error

describe('useLogs()', () => {

  beforeEach(async () => {
    console.error = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock
  })

  afterEach(async () => {
    console.error = _console_error
    const keys = await AsyncStorage.getAllKeys()
    await AsyncStorage.multiRemove(keys)
  });

  test('should have `loaded` prop', async () => {
    const hook = await _renderHook()

    // run useEffect for loading async storage
    await waitForLoaded(hook)

    expect(hook.result.current.state.loaded).toBe(true)
  })

  test('should load `state` from async storage', async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: testItems }))

    const hook = await _renderHook()
    await waitForLoaded(hook)

    expect(hook.result.current.state.items).toEqual(testItems)
  })

  test('should initiate `state` with empty `items` when async storage is empty', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)
    expect(hook.result.current.state.items).toEqual([])
  })

  test('should preserve stored logs when async storage cannot be parsed', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '🐇')
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem')
    setItemSpy.mockClear()

    const hook = await _renderHook()

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(hook.result.current.state.loaded).toBe(false)
    expect(setItemSpy).not.toHaveBeenCalledWith(STORAGE_KEY, expect.anything())
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('🐇')
  })

  test('should import', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.updater.import({
        items: testItems
      })
    })

    expect(hook.result.current.state.items).toEqual(testItems)
  })

  test('should addLog', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.updater.addLog(testItems[0])
    })

    expect(hook.result.current.state.items).toEqual([testItems[0]])
  })

  test('should editLog', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

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

    const hook = await _renderHook()
    await waitForLoaded(hook)

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
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => hook.result.current.updater.addLog(testItems[0]))
    await act(() => hook.result.current.updater.addLog(testItems[1]))
    await act(() => hook.result.current.updater.deleteLog(testItems[0].id))

    expect(hook.result.current.state.items).toEqual([testItems[1]])
  })

  test('should reset', async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: [] }))

    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => hook.result.current.updater.updateLogs(testItems))
    expect(hook.result.current.state.items).toEqual(testItems)

    await act(() => hook.result.current.updater.reset())
    expect(hook.result.current.state.items).toEqual([])
  })

})
