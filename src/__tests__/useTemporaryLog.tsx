import { act, renderHook, waitFor } from '@testing-library/react-native';
import { TemporaryLogProvider, useTemporaryLog } from '@/hooks/useTemporaryLog';
import { _generateItem } from './utils';

const wrapper = ({ children }) => (
  <TemporaryLogProvider>{children}</TemporaryLogProvider>
);

describe('useTemporaryLog()', () => {
  test('preserves historical sleep quality while editing another field', async () => {
    const existingItem = _generateItem({
      message: 'Before edit',
      sleep: { quality: 'very_good' },
    });

    const hook = await renderHook(() => useTemporaryLog(existingItem), { wrapper });

    await waitFor(() => {
      expect(hook.result.current.isInitialized).toBe(true);
    });

    await act(async () => {
      hook.result.current.update({ message: 'After edit' });
    });

    await waitFor(() => {
      expect(hook.result.current.data).toEqual(expect.objectContaining({
        message: 'After edit',
        sleep: { quality: 'very_good' },
      }));
    });
  });
});
