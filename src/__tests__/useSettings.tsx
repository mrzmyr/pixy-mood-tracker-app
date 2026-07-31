import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import _ from 'lodash'
import { INITIAL_STATE, SettingsProvider, STORAGE_KEY, useSettings } from '../hooks/useSettings'

const wrapper = ({ children }) => (
  <SettingsProvider>
    {children}
  </SettingsProvider>
)

const _renderHook = () => {
  return renderHook(() => ({
    state: useSettings()
  }), { wrapper })
}

const waitForLoaded = (hook) => waitFor(() => {
  expect(hook.result.current.state.settings.loaded).toBe(true)
})

const _console_error = console.error

const STATIC_DEVICE_ID = 'test-device-id'

const LOADED_STATE = {
  ...INITIAL_STATE,
  loaded: true,
  deviceId: STATIC_DEVICE_ID
}

jest.mock('uuid', () => ({ v4: () => STATIC_DEVICE_ID }));

describe('useSettings()', () => {

  beforeEach(async () => {
    await AsyncStorage.clear()
    console.error = jest.fn()
  })

  afterEach(() => {
    console.error = _console_error
  });

  test('should have `loaded` prop', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)
    expect(hook.result.current.state.settings.loaded).toBe(true)
  })

  test('should load from settings async storage & initialize device id if missing', async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...INITIAL_STATE,
      reminderTime: '12:00',
    }))
    const hook = await _renderHook()
    await waitForLoaded(hook)
    expect(hook.result.current.state.settings.reminderTime).toBe('12:00')
    expect(hook.result.current.state.settings.deviceId).toBe(STATIC_DEVICE_ID)
  })

  test('should initiate with empty `settings` when async storage is empty', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    expect(hook.result.current.state.settings).toEqual(LOADED_STATE)
  })

  test('should initiate with empty `settings` when async storage is falsely', async () => {
    AsyncStorage.setItem(STORAGE_KEY, '🐇')
    const hook = await _renderHook()
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(console.error).toHaveBeenCalled();
  })

  test('should import', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.state.importSettings({
        ...INITIAL_STATE,
        reminderTime: '12:00',
      })
    })

    expect(hook.result.current.state.settings.reminderTime).toBe('12:00')
  })

  test('should addActionDone', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.state.addActionDone('test')
    })

    const ACTIONS_DONE = [{
      title: 'test',
      date: expect.any(String)
    }]

    expect(hook.result.current.state.settings.actionsDone).toEqual(ACTIONS_DONE)
    const json = await AsyncStorage.getItem(STORAGE_KEY)
    expect(JSON.parse(json!)).toEqual({
      ..._.omit(LOADED_STATE, 'loaded'),
      actionsDone: ACTIONS_DONE,
    });
  })

  test('should not addActionDone when it already exists', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.state.addActionDone('test')
    })

    await act(() => {
      hook.result.current.state.addActionDone('test')
    })

    const ACTIONS_DONE = [{
      title: 'test',
      date: expect.any(String)
    }]

    expect(hook.result.current.state.settings.actionsDone).toEqual(ACTIONS_DONE)
    const json = await AsyncStorage.getItem(STORAGE_KEY)
    expect(JSON.parse(json!)).toEqual({
      ..._.omit(LOADED_STATE, 'loaded'),
      actionsDone: ACTIONS_DONE,
    });
  })

  test('should hasActionDone', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.state.addActionDone('test')
    })

    expect(hook.result.current.state.hasActionDone('test')).toBe(true)
    expect(hook.result.current.state.hasActionDone('test2')).toBe(false)
  })

  test('should resetSettings', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.state.resetSettings()
    })

    expect(hook.result.current.state.settings).toEqual(LOADED_STATE)
  })

  test('should `toggleStep`', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.state.toggleStep('feedback')
    })

    expect(hook.result.current.state.settings.steps.length).toEqual(4)

    await act(() => {
      hook.result.current.state.toggleStep('feedback')
    })

    expect(hook.result.current.state.settings.steps[3]).toEqual('message')
  })

  test('should `toggleStep` with value', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.state.toggleStep('tags')
      hook.result.current.state.toggleStep('tags', true)
      hook.result.current.state.toggleStep('tags', true)
    })

    expect(hook.result.current.state.settings.steps).toEqual([
      "rating",
      "emotions",
      "message",
      "feedback",
      "tags",
    ])
  })

  test('should `hasStep`', async () => {
    const hook = await _renderHook()
    await waitForLoaded(hook)

    await act(() => {
      hook.result.current.state.toggleStep('feedback')
    })

    expect(hook.result.current.state.hasStep('feedback')).toEqual(false)
  })

})
