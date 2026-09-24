import { useCallback } from 'react'
import { useCurrentChain, useHasFeature } from '@/hooks/useChains'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3ReadOnly'
import { FEATURES } from '@safe-global/utils/utils/chains'
import { createPaymentResolver } from '../services/paymentResolver'

export function usePaymentResolver() {
  const chain = useCurrentChain()
  const { safe, safeAddress, safeLoaded } = useSafeInfo()
  const provider = useWeb3ReadOnly()
  const resolveNames = useHasFeature(FEATURES.DOMAIN_LOOKUP)
  return useCallback(async () => {
    if (!provider || !chain || !safeLoaded || safe.chainId !== chain.chainId)
      throw new Error('Safe and network must finish loading before importing.')
    const context = { chainId: chain.chainId, chainName: chain.chainName, safeAddress, shortName: chain.shortName }
    const resolver = await createPaymentResolver(provider, {
      ...context,
      nativeSymbol: chain.nativeCurrency.symbol,
      nativeDecimals: chain.nativeCurrency.decimals,
      resolveNames: !!resolveNames,
    })
    return { context, resolver }
  }, [provider, chain, safeLoaded, safe.chainId, safeAddress, resolveNames])
}
