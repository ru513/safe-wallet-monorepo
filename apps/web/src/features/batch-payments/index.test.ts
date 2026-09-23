import { renderHook } from '@/tests/test-utils'
import { useHasFeature } from '@/hooks/useChains'
import { FEATURES } from '@safe-global/utils/utils/chains'
import { useLoadFeature } from '@/features/__core__'
import { BatchPaymentsFeature } from './index'

jest.mock('@/hooks/useChains')

it('does not load batch payments when its chain flag is disabled', () => {
  jest.mocked(useHasFeature).mockReturnValue(false)
  const load = jest.spyOn(BatchPaymentsFeature, 'load')
  const { result } = renderHook(() => useLoadFeature(BatchPaymentsFeature))
  expect(useHasFeature).toHaveBeenCalledWith(FEATURES.BATCH_PAYMENTS)
  expect(result.current.$isDisabled).toBe(true)
  expect(load).not.toHaveBeenCalled()
  load.mockRestore()
})
