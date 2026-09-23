import { useContext, type PropsWithChildren } from 'react'
import { act, render, waitFor } from '@/tests/test-utils'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { initialContext, TxFlowContext } from '@/components/tx-flow/TxFlowProvider'
import { createMultiSendCallOnlyTx } from '@/services/tx/tx-sender'
import { safeTxBuilder } from '@/tests/builders/safeTx'
import { useHasPermission } from '@/permissions/hooks/useHasPermission'
import { usePaymentResolver } from '../hooks/usePaymentResolver'
import { ReviewBatchPayments } from './ReviewBatchPayments'
import { exampleBatch } from './fixtures'

jest.mock('@/services/tx/tx-sender', () => ({ createMultiSendCallOnlyTx: jest.fn() }))
jest.mock('../hooks/usePaymentResolver')
jest.mock('@/permissions/hooks/useHasPermission')
jest.mock('@/features/safe-shield/SafeShieldContext', () => ({ useSafeShieldForRecipients: jest.fn() }))
jest.mock('@/components/tx/ReviewTransactionV2', () => ({
  __esModule: true,
  default: ({ children }: PropsWithChildren) => <>{children}</>,
}))

describe('ReviewBatchPayments', () => {
  const setSafeTx = jest.fn()
  const setSafeTxError = jest.fn()
  const setNonce = jest.fn()
  const transaction = safeTxBuilder().build()
  const getResolver = jest.fn()
  const context = { chainId: '1', safeAddress: exampleBatch.safeAddress, shortName: 'eth' }
  const resolver = {
    getToken: jest.fn(async () => ({ decimals: 18, symbol: 'ETH', balance: 10n ** 18n })),
    resolveName: jest.fn(),
  }

  function Wrapper({ children }: PropsWithChildren) {
    const safeTx = useContext(SafeTxContext)
    return (
      <SafeTxContext.Provider value={{ ...safeTx, setSafeTx, setSafeTxError, setNonce }}>
        <TxFlowContext.Provider value={{ ...initialContext, data: exampleBatch, txNonce: 7 }}>
          {children}
        </TxFlowContext.Provider>
      </SafeTxContext.Provider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useHasPermission).mockReturnValue(true)
    jest.mocked(usePaymentResolver).mockReturnValue(getResolver)
    getResolver.mockResolvedValue({ context, resolver })
    jest.mocked(createMultiSendCallOnlyTx).mockResolvedValue(transaction)
  })

  it('builds all calls, preserves replacement nonce and keeps the transaction for the signing step', async () => {
    const { unmount } = render(
      <Wrapper>
        <ReviewBatchPayments onSubmit={jest.fn()} />
      </Wrapper>,
    )
    await waitFor(() => expect(setSafeTx).toHaveBeenLastCalledWith(transaction))
    expect(createMultiSendCallOnlyTx).toHaveBeenCalledWith([
      { to: exampleBatch.recipients[0].recipient, value: '100000000000000000', data: '0x' },
    ])
    expect(setNonce).toHaveBeenCalledWith(7)
    setSafeTx.mockClear()
    unmount()
    expect(setSafeTx).not.toHaveBeenCalled()
  })

  it('rejects a Safe/network mismatch before transaction construction', async () => {
    getResolver.mockResolvedValue({ context: { ...context, chainId: '100' }, resolver })
    render(
      <Wrapper>
        <ReviewBatchPayments onSubmit={jest.fn()} />
      </Wrapper>,
    )
    await waitFor(() =>
      expect(setSafeTxError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/Safe or network changed/) }),
      ),
    )
    expect(createMultiSendCallOnlyTx).not.toHaveBeenCalled()
  })

  it('blocks proposal without transaction permission', async () => {
    jest.mocked(useHasPermission).mockReturnValue(false)
    render(
      <Wrapper>
        <ReviewBatchPayments onSubmit={jest.fn()} />
      </Wrapper>,
    )
    await waitFor(() => expect(setSafeTxError).toHaveBeenCalledWith(expect.any(Error)))
    expect(createMultiSendCallOnlyTx).not.toHaveBeenCalled()
  })

  it('ignores a pending transaction build after leaving review', async () => {
    let finish: (value: typeof transaction) => void = () => {}
    jest.mocked(createMultiSendCallOnlyTx).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const { unmount } = render(
      <Wrapper>
        <ReviewBatchPayments onSubmit={jest.fn()} />
      </Wrapper>,
    )
    await waitFor(() => expect(createMultiSendCallOnlyTx).toHaveBeenCalled())
    unmount()
    setSafeTx.mockClear()
    await act(async () => finish(transaction))
    expect(setSafeTx).not.toHaveBeenCalled()
  })
})
