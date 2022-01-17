import { renderHook, act } from '@testing-library/react-hooks'
import { LogsProvider, useLogs } from '../hooks/useLogs'
import { SettingsProvider, useSettings } from '../hooks/useSettings'

const wrapper = ({ children }) => (
  <SettingsProvider>
    <LogsProvider>{children}</LogsProvider>
  </SettingsProvider>
)

describe('useLogs()', () => {

  test('should import', () => {
    const { result } = renderHook(() => useLogs(), { wrapper })

    act(() => {
      result.current.dispatch({
        type: 'import',
        payload: {
          items: {
            '2022-01-01': {
              date: '2022-01-01',
              rating: 'neutral',
              message: 'test message',
            }
          }
        }
      })
    })

    expect(result.current.state.items['2022-01-01'].message).toBe('test message')
  })

  test('should add', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLogs(), { wrapper })

    await waitForNextUpdate()

    act(() => {
      result.current.dispatch({
        type: 'add',
        payload: {
          date: '2022-01-03',
          rating: 'neutral',
          message: 'test message',
        }
      })
    })

    expect(result.current.state.items['2022-01-03'].message).toBe('test message')
  })

  test('should remove', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLogs(), { wrapper })

    await waitForNextUpdate()

    act(() => {
      result.current.dispatch({
        type: 'remove',
        payload: {
          date: '2022-01-03',
          rating: 'neutral',
          message: 'test message',
        }
      })
    })

    expect(result.current.state.items['2020-01-02']).toBe(undefined)
  })

  test('should reset', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLogs(), { wrapper })

    await waitForNextUpdate()

    act(() => {
      result.current.dispatch({
        type: 'reset'
      })
    })

    expect(Object.keys(result.current.state.items).length).toBe(0)
  })
})