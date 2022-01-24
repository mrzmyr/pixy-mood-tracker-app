import { renderHook } from '@testing-library/react-hooks'
import Colors from '../constants/Colors'
import useScale from '../hooks/useScale'
import { SettingsProvider } from '../hooks/useSettings'

const wrapper = ({ children }) => (
  <SettingsProvider>
    {children}
  </SettingsProvider>
)

describe('useScales()', () => {
  test('should return colors for type', () => {
    const { result } = renderHook(() => useScale('ColorBrew-RdYlGn'), { wrapper })
    expect(result.current.colors.bad).toBe(Colors.light.scales['ColorBrew-RdYlGn'].bad)
  })
})
