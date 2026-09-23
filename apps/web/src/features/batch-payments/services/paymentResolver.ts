import { type JsonRpcProvider, ZeroAddress } from 'ethers'
import { ERC20__factory } from '@safe-global/utils/types/contracts'
import { getERC20TokenInfoOnChain } from '@/utils/tokens'
import type { PaymentResolver } from '../types'

export const createPaymentResolver = async (
  provider: JsonRpcProvider,
  context: {
    chainId: string
    safeAddress: string
    nativeSymbol: string
    nativeDecimals: number
    resolveNames: boolean
  },
): Promise<PaymentResolver> => {
  const network = await provider.getNetwork()
  if (network.chainId.toString() !== context.chainId) throw new Error('Network changed. Please try again.')
  return {
    resolveName: (name) =>
      context.resolveNames && !name.startsWith('0x') && name.includes('.')
        ? provider.resolveName(name)
        : Promise.resolve(null),
    getToken: async (address) => {
      if (address === ZeroAddress)
        return {
          decimals: context.nativeDecimals,
          symbol: context.nativeSymbol,
          balance: await provider.getBalance(context.safeAddress),
        }
      const token = ERC20__factory.connect(address, provider)
      try {
        const [metadata, balance] = await Promise.all([
          getERC20TokenInfoOnChain(address, provider),
          token.balanceOf(context.safeAddress),
        ])
        const info = metadata?.[0]
        if (!info) throw new Error('Token metadata unavailable.')
        return { decimals: info.decimals, symbol: info.symbol.slice(0, 64), balance }
      } catch {
        throw new Error(
          `Unable to read token metadata or balance for ${address}. Check the token address and network, then retry.`,
        )
      }
    },
  }
}
