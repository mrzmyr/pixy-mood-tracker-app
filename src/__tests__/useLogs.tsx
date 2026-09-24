import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Sentry from '@sentry/react-native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { AnalyticsProvider } from '../hooks/useAnalytics'
import { snapshotLogs } from '../helpers/logSnapshots'
import { findUnexpectedShrink, LogsProvider, LogsState, STORAGE_KEY, useLogState, useLogUpdater } from '../hooks/useLogs'
import { SettingsProvider } from '../hooks/useSettings'
import { _generateItem } from './utils'

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}))

jest.mock('../helpers/logSnapshots', () => ({
  snapshotLogs: jest.fn().mockResolvedValue(undefined),
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
    jest.clearAllMocks()
    console.error = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock
  })

  afterEach(async () => {
    console.error = _console_error
    const keys = await AsyncStorage.getAllKeys()
    await AsyncStorage.multiRemove(keys)
    jest.restoreAllMocks()
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

    await waitFor(() => {
      expect(Sentry.captureException).toHaveBeenCalled()
    })

    expect(hook.result.current.state.loaded).toBe(false)
    expect(setItemSpy).not.toHaveBeenCalledWith(STORAGE_KEY, expect.anything())
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('🐇')
  })

  test('should keep logs unloaded when async storage cannot be read', async () => {
    const readError = new Error('disk unavailable')
    const getItemSpy = jest.spyOn(AsyncStorage, 'getItem').mockImplementation(
      (key) => key === STORAGE_KEY
        ? Promise.reject(readError)
        : Promise.resolve(null)
    )
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem')

    const hook = await _renderHook()

    await waitFor(() => {
      expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEY)
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'storage_read_failed',
          message: 'Stored data could not be read',
          why: `Reading storage key "${STORAGE_KEY}" failed: disk unavailable`,
          fix: 'Retry the operation and check device storage access',
        })
      )
    })

    expect(hook.result.current.state.loaded).toBe(false)
    expect(setItemSpy).not.toHaveBeenCalledWith(STORAGE_KEY, expect.anything())

    getItemSpy.mockRestore()
    setItemSpy.mockRestore()
  })

  test('should resolve `addLog` only after the log is written', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => hook.result.current.updater.addLog(testItems[0]))

    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!)
    expect(stored.items).toEqual([testItems[0]])
  })

  test('should reject `addLog` before stored logs are loaded', async () => {
    let resolveLoad: (value: string | null) => void = () => {}
    jest.spyOn(AsyncStorage, 'getItem').mockImplementation((key) =>
      key === STORAGE_KEY
        ? new Promise((resolve) => { resolveLoad = resolve })
        : Promise.resolve(null)
    )
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem')

    const hook = await _renderHook()

    await expect(hook.result.current.updater.addLog(testItems[0])).rejects.toMatchObject({
      status: 'logs_not_loaded',
      message: 'Entry could not be saved',
      why: 'Stored entries are still loading',
      fix: 'Restart Pixy and try again',
    })
    expect(setItemSpy).not.toHaveBeenCalledWith(STORAGE_KEY, expect.anything())

    await act(async () => resolveLoad(JSON.stringify({ items: [testItems[1]] })))
    await waitForLoaded(hook)
    expect(hook.result.current.state.items).toEqual([testItems[1]])
  })

  test('should reject `addLog` when stored logs could not be loaded', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '🐇')
    const hook = await _renderHook()

    await waitFor(() => {
      expect(Sentry.captureException).toHaveBeenCalled()
    })

    await expect(hook.result.current.updater.addLog(testItems[0])).rejects.toMatchObject({
      status: 'logs_not_loaded',
      why: 'Stored entries could not be loaded, so saving could overwrite them',
    })
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('🐇')
  })

  test('should reject `addLog` when the write fails and write it on `flush`', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem')
      .mockRejectedValue(new Error('disk full'))

    let addError: unknown
    await act(async () => {
      await hook.result.current.updater.addLog(testItems[0]).catch((error) => {
        addError = error
      })
    })

    expect(addError).toMatchObject({
      status: 'storage_write_failed',
      message: 'Stored data could not be saved',
      fix: 'Retry the operation and check available device storage',
    })
    expect(hook.result.current.state.items).toEqual([testItems[0]])

    setItemSpy.mockRestore()
    await act(() => hook.result.current.updater.flush())

    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!)
    expect(stored.items).toEqual([testItems[0]])
  })

  test('should write changes in order when an earlier write is slow', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    const originalSetItem = AsyncStorage.setItem
    let releaseFirstWrite: () => void = () => {}
    let calls = 0
    jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (key, value) => {
      calls++
      if (calls === 1) {
        await new Promise<void>((resolve) => { releaseFirstWrite = resolve })
      }
      return originalSetItem(key, value)
    })

    let first: Promise<void> = Promise.resolve()
    let second: Promise<void> = Promise.resolve()
    await act(async () => {
      first = hook.result.current.updater.addLog(testItems[0])
      second = hook.result.current.updater.addLog(testItems[1])
    })

    // The second write must wait for the first, even though it is newer.
    await waitFor(() => expect(calls).toBe(1))
    releaseFirstWrite()
    await act(() => Promise.all([first, second]))
    expect(calls).toBe(2)

    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!)
    expect(stored.items).toEqual(testItems)
  })

  test('should snapshot stored logs as loaded', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: testItems }))

    const hook = await _renderHook()
    await waitForLoaded(hook)

    expect(snapshotLogs).toHaveBeenCalledTimes(1)
    expect(snapshotLogs).toHaveBeenCalledWith({ items: testItems })
  })

  test('should not snapshot when nothing is stored', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    expect(snapshotLogs).not.toHaveBeenCalled()
  })

  describe('findUnexpectedShrink()', () => {
    const state = (count: number): LogsState => ({
      loaded: true,
      items: testItems.slice(0, count),
    })

    test('should allow a delete to remove one entry', () => {
      expect(findUnexpectedShrink(state(2), state(1), 'delete')).toBeNull()
    })

    test('should allow import and reset to replace all entries', () => {
      expect(findUnexpectedShrink(state(2), state(0), 'import')).toBeNull()
      expect(findUnexpectedShrink(state(2), state(0), 'reset')).toBeNull()
    })

    test('should block add, edit and tag removal from dropping entries', () => {
      for (const type of ['add', 'edit', 'removeTag'] as const) {
        expect(findUnexpectedShrink(state(2), state(1), type)).toMatchObject({
          status: 'logs_unexpected_shrink',
          message: 'Change was blocked to protect your entries',
          why: `Action "${type}" would remove 1 entries, but at most 0 may be removed`,
          fix: 'Export your data, restart Pixy and report this issue',
        })
      }
    })

    test('should block a delete from removing more than one entry', () => {
      expect(findUnexpectedShrink(state(2), state(0), 'delete')).toMatchObject({
        status: 'logs_unexpected_shrink',
      })
    })
  })

  test('should restore only missing logs and keep current ones', async () => {
    const edited = { ...testItems[0], message: 'edited after backup' }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: [edited] }))

    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => hook.result.current.updater.restoreLogs(testItems))

    expect(hook.result.current.state.items).toEqual([edited, testItems[1]])
    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!)
    expect(stored.items).toEqual([edited, testItems[1]])
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
