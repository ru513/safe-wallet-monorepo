import { renderHook } from '@/tests/test-utils'
import { useCurrentChain, useHasFeature } from '@/hooks/useChains'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3ReadOnly'
import { createPaymentResolver } from '../services/paymentResolver'
import { usePaymentResolver } from './usePaymentResolver'
import { chainBuilder } from '@/tests/builders/chains'
import { extendedSafeInfoBuilder } from '@/tests/builders/safe'
import { JsonRpcProvider } from 'ethers'

jest.mock('@/hooks/useChains')
jest.mock('@/hooks/useSafeInfo')
jest.mock('@/hooks/wallets/web3ReadOnly')
jest.mock('../services/paymentResolver')

describe('usePaymentResolver', () => {
  const safe = extendedSafeInfoBuilder().with({ chainId: '1' }).build()
  const chain = chainBuilder()
    .with({
      chainId: '1',
      shortName: 'eth',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, logoUri: '' },
    })
    .build()
  const provider = new JsonRpcProvider('http://localhost:8545', 1, { staticNetwork: true })
  beforeEach(() => {
    jest.mocked(useCurrentChain).mockReturnValue(chain)
    jest.mocked(useHasFeature).mockReturnValue(true)
    jest
      .mocked(useSafeInfo)
      .mockReturnValue({ safe, safeAddress: safe.address.value, safeLoaded: true, safeLoading: false })
    jest.mocked(useWeb3ReadOnly).mockReturnValue(provider)
  })
  afterAll(() => provider.destroy())

  it('reuses the current Safe, chain configuration and read-only provider', async () => {
    const { result } = renderHook(usePaymentResolver)
    await result.current()
    expect(createPaymentResolver).toHaveBeenCalledWith(
      provider,
      expect.objectContaining({
        chainId: '1',
        safeAddress: safe.address.value,
        nativeDecimals: 18,
        nativeSymbol: 'ETH',
        resolveNames: true,
      }),
    )
  })

  it('rejects an unresolved chain transition', async () => {
    jest.mocked(useCurrentChain).mockReturnValue({ ...chain, chainId: '100' })
    const { result } = renderHook(usePaymentResolver)
    await expect(result.current()).rejects.toThrow(/finish loading/)
  })

  it('rejects a missing provider', async () => {
    jest.mocked(useWeb3ReadOnly).mockReturnValue(undefined)
    const { result } = renderHook(usePaymentResolver)
    await expect(result.current()).rejects.toThrow(/finish loading/)
  })
})
