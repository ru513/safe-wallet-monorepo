import { fireEvent, render, screen } from '@/tests/test-utils'
import { TxModalContext } from '@/components/tx-flow'
import { useHasPermission } from '@/permissions/hooks/useHasPermission'
import { BatchPaymentsButton } from './BatchPaymentsButton'
import { BatchPaymentsFlow } from './BatchPaymentsFlow'

jest.mock('@/permissions/hooks/useHasPermission')
jest.mock('./BatchPaymentsFlow', () => ({ BatchPaymentsFlow: () => null }))

describe('BatchPaymentsButton', () => {
  it('opens the standard transaction modal and carries a replacement nonce', () => {
    jest.mocked(useHasPermission).mockReturnValue(true)
    const setTxFlow = jest.fn()
    render(
      <TxModalContext.Provider value={{ txFlow: undefined, setTxFlow, setFullWidth: jest.fn() }}>
        <BatchPaymentsButton txNonce={7} />
      </TxModalContext.Provider>,
    )
    fireEvent.click(screen.getByText('Import CSV'))
    expect(setTxFlow).toHaveBeenCalledWith(<BatchPaymentsFlow txNonce={7} />)
  })

  it('is unavailable to spending-limit-only users', () => {
    jest.mocked(useHasPermission).mockReturnValue(false)
    render(<BatchPaymentsButton />)
    expect(screen.queryByText('Import CSV')).not.toBeInTheDocument()
  })
})
