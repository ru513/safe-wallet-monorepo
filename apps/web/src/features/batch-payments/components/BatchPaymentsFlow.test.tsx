import { fireEvent, render, screen } from '@/tests/test-utils'
import { useHasFeature } from '@/hooks/useChains'
import useSafeInfo from '@/hooks/useSafeInfo'
import useChainId from '@/hooks/useChainId'
import { useHasPermission } from '@/permissions/hooks/useHasPermission'
import { extendedSafeInfoBuilder } from '@/tests/builders/safe'
import { BatchPaymentsFlow } from './BatchPaymentsFlow'

jest.mock('@/hooks/useChains')
jest.mock('@/hooks/useSafeInfo')
jest.mock('@/hooks/useChainId')
jest.mock('@/permissions/hooks/useHasPermission')
jest.mock('@/components/tx-flow/TxFlow', () => ({ TxFlow: () => <input aria-label="Flow draft" defaultValue="" /> }))
jest.mock('./ReviewBatchPayments', () => ({ ReviewBatchPayments: () => null }))

describe('BatchPaymentsFlow', () => {
  const safe = extendedSafeInfoBuilder().with({ chainId: '1' }).build()
  beforeEach(() => {
    jest.mocked(useHasFeature).mockReturnValue(true)
    jest.mocked(useHasPermission).mockReturnValue(true)
    jest.mocked(useChainId).mockReturnValue('1')
    jest
      .mocked(useSafeInfo)
      .mockReturnValue({ safe, safeAddress: safe.address.value, safeLoaded: true, safeLoading: false })
  })

  it('resets the entire transaction draft when the Safe changes', () => {
    const { rerender } = render(<BatchPaymentsFlow />)
    fireEvent.change(screen.getByLabelText('Flow draft'), { target: { value: 'old payment' } })
    jest.mocked(useSafeInfo).mockReturnValue({
      safe,
      safeAddress: '0x2222222222222222222222222222222222222222',
      safeLoaded: true,
      safeLoading: false,
    })
    rerender(<BatchPaymentsFlow />)
    expect(screen.getByLabelText('Flow draft')).toHaveValue('')
  })

  it('unmounts transaction state during a chain transition', () => {
    const { rerender } = render(<BatchPaymentsFlow />)
    jest.mocked(useChainId).mockReturnValue('100')
    rerender(<BatchPaymentsFlow />)
    expect(screen.queryByLabelText('Flow draft')).not.toBeInTheDocument()
    expect(screen.getByText(/unavailable/)).toBeInTheDocument()
  })

  it('blocks entry with the feature disabled', () => {
    jest.mocked(useHasFeature).mockReturnValue(false)
    render(<BatchPaymentsFlow />)
    expect(screen.queryByLabelText('Flow draft')).not.toBeInTheDocument()
  })

  it('blocks entry without proposal permission', () => {
    jest.mocked(useHasPermission).mockReturnValue(false)
    render(<BatchPaymentsFlow />)
    expect(screen.queryByLabelText('Flow draft')).not.toBeInTheDocument()
  })
})
