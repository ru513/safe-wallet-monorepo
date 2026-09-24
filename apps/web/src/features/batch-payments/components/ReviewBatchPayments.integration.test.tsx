import { useContext, useState, type PropsWithChildren } from 'react'
import { fireEvent, render, screen, waitFor } from '@/tests/test-utils'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { initialContext, TxFlowContext } from '@/components/tx-flow/TxFlowProvider'
import { SlotProvider } from '@/components/tx-flow/slots'
import { RiskConfirmation } from '@/components/tx-flow/features/RiskConfirmation'
import { SafeShieldProvider } from '@/features/safe-shield/SafeShieldContext'
// eslint-disable-next-line no-restricted-imports -- Safe Shield does not expose a feature barrel.
import { useRecipientAnalysis } from '@/features/safe-shield/hooks'
import { usePaymentResolver } from '../hooks/usePaymentResolver'
import { getAndValidateSafeSDK } from '@/services/tx/tx-sender/sdk'
import useSafeInfo from '@/hooks/useSafeInfo'
import { extendedSafeInfoBuilder } from '@/tests/builders/safe'
import { safeTxBuilder } from '@/tests/builders/safeTx'
import { server } from '@/tests/server'
import { http, HttpResponse } from 'msw'
import { GATEWAY_URL } from '@/config/gateway'
import type { SafeTransaction } from '@safe-global/types-kit'
import { ReviewBatchPayments } from './ReviewBatchPayments'
import { exampleBatch } from './fixtures'
import { getPaymentTotals } from '../services/validatePayments'

jest.mock('../hooks/usePaymentResolver')
jest.mock('@/services/tx/tx-sender/sdk')
jest.mock('@/permissions/hooks/useHasPermission', () => ({ useHasPermission: () => true }))
jest.mock('@/hooks/useSafeInfo')
jest.mock('@/hooks/useIsTrustedSafe', () => ({ __esModule: true, default: () => true }))
jest.mock('@/components/common/CheckWallet', () => ({
  __esModule: true,
  default: ({ children }: { children: (ok: boolean) => React.ReactNode }) => children(true),
}))
jest.mock('@/components/tx/confirmation-views', () => ({ __esModule: true, default: () => null }))
jest.mock('@/features/safe-shield/hooks', () => {
  const empty = [undefined, undefined, false]
  const counterparties = { recipient: empty, contract: empty, deadlock: empty }
  const threat = [
    { THREAT: [{ type: 'MALICIOUS', severity: 'CRITICAL', title: 'Test threat', description: 'Test threat' }] },
    undefined,
    false,
  ]
  return {
    useRecipientAnalysis: jest.fn(() => empty),
    useCounterpartyAnalysis: () => counterparties,
    useThreatAnalysis: () => threat,
    useRecipientAnalysisWithPoisoning: (result: unknown) => result,
  }
})

const batch = {
  ...exampleBatch,
  recipients: [...exampleBatch.recipients, { ...exampleBatch.recipients[0], row: 3 }],
  duplicateRows: [3],
}
batch.totals = getPaymentTotals(batch.recipients)

function Wrapper({ children }: PropsWithChildren) {
  const defaults = useContext(SafeTxContext)
  const [safeTx, setSafeTx] = useState<SafeTransaction>()
  const [safeTxError, setSafeTxError] = useState<Error>()
  return (
    <SafeTxContext.Provider value={{ ...defaults, safeTx, setSafeTx, safeTxError, setSafeTxError }}>
      <SafeShieldProvider>
        <SlotProvider>
          <TxFlowContext.Provider value={{ ...initialContext, data: batch, isCreation: true }}>
            {children}
          </TxFlowContext.Provider>
        </SlotProvider>
      </SafeShieldProvider>
    </SafeTxContext.Provider>
  )
}

describe('batch review with Wallet review and Safe Shield', () => {
  const createTransaction = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    const safe = extendedSafeInfoBuilder()
      .with({ chainId: '1', address: { value: exampleBatch.safeAddress }, deployed: true })
      .build()
    jest
      .mocked(useSafeInfo)
      .mockReturnValue({ safe, safeAddress: exampleBatch.safeAddress, safeLoaded: true, safeLoading: false })
    createTransaction.mockResolvedValue(
      safeTxBuilder()
        .with({ data: { ...safeTxBuilder().build().data, data: '0x', value: '0', nonce: 0 } })
        .build(),
    )
    jest
      .mocked(getAndValidateSafeSDK)
      .mockReturnValue({ createTransaction } as unknown as ReturnType<typeof getAndValidateSafeSDK>)
    const getResolver = jest.fn().mockResolvedValue({
      context: { chainId: exampleBatch.chainId, safeAddress: exampleBatch.safeAddress },
      resolver: { getToken: async () => ({ decimals: 18, symbol: 'ETH', balance: 10n ** 18n }) },
    })
    jest.mocked(usePaymentResolver).mockReturnValue(getResolver)
    server.use(
      http.post(`${GATEWAY_URL}/v1/chains/:chainId/transactions/:safeAddress/preview`, () =>
        HttpResponse.json({ txInfo: {}, txData: { to: { value: exampleBatch.safeAddress }, operation: 0 } }),
      ),
    )
  })

  it('preserves the shared risk gate and passes every payment to the call-only builder', async () => {
    const onSubmit = jest.fn()
    render(
      <Wrapper>
        <ReviewBatchPayments onSubmit={onSubmit}>
          <RiskConfirmation />
        </ReviewBatchPayments>
      </Wrapper>,
    )
    const button = await screen.findByTestId('continue-sign-btn')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(createTransaction).toHaveBeenCalledWith({
      transactions: Array.from({ length: 2 }, () => ({
        to: exampleBatch.recipients[0].recipient,
        value: exampleBatch.recipients[0].units,
        data: '0x',
      })),
      onlyCalls: true,
    })
    await waitFor(() => expect(useRecipientAnalysis).toHaveBeenCalledWith([exampleBatch.recipients[0].recipient]))
    fireEvent.click(await screen.findByRole('checkbox'))
    await waitFor(() => expect(screen.getByTestId('continue-sign-btn')).toBeEnabled())
    fireEvent.click(screen.getByTestId('continue-sign-btn'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('blocks progression when the real preview request fails', async () => {
    server.use(
      http.post(
        `${GATEWAY_URL}/v1/chains/:chainId/transactions/:safeAddress/preview`,
        () => new HttpResponse(null, { status: 503 }),
      ),
    )
    render(
      <Wrapper>
        <ReviewBatchPayments onSubmit={jest.fn()}>
          <RiskConfirmation />
        </ReviewBatchPayments>
      </Wrapper>,
    )
    expect(await screen.findByTestId('error-transaction-preview')).toBeInTheDocument()
    expect(screen.queryByTestId('continue-sign-btn')).not.toBeInTheDocument()
  })
})
