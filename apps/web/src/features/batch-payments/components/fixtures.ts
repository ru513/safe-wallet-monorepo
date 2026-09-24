import { ZeroAddress, parseUnits } from 'ethers'
import type { BatchPaymentsData } from '../types'

export const exampleBatch: BatchPaymentsData = {
  csv: 'token_address,receiver,amount\n,0x1234567890123456789012345678901234567890,0.1',
  chainId: '1',
  chainName: 'Ethereum',
  safeAddress: '0x1111111111111111111111111111111111111111',
  recipients: [
    {
      row: 2,
      recipient: '0x1234567890123456789012345678901234567890',
      recipientInput: '0x1234567890123456789012345678901234567890',
      tokenAddress: ZeroAddress,
      amount: '0.1',
      units: parseUnits('0.1').toString(),
      decimals: 18,
      symbol: 'ETH',
    },
  ],
  totals: [{ tokenAddress: ZeroAddress, units: parseUnits('0.1').toString(), decimals: 18, symbol: 'ETH' }],
  duplicateRows: [],
}
