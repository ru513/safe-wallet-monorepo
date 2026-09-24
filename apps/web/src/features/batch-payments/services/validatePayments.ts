import { getAddress, isAddress, MaxUint256, parseUnits, ZeroAddress } from 'ethers'
import type { BatchPaymentsData, ImportIssue, Payment, PaymentResolver, PaymentTotal, TokenDetails } from '../types'
import { parsePaymentCsv } from './parseCsv'
import { createTokenTransferParams } from '@/services/tx/tokenTransferParams'

export const parsePaymentAmount = (amount: string, decimals: number): bigint => {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('Invalid token decimals.')
  if (!/^\d+(\.\d+)?$/.test(amount) || (amount.split('.')[1]?.length || 0) > decimals) {
    throw new Error(`Amount must have at most ${decimals} decimal places.`)
  }
  const units = parseUnits(amount, decimals)
  if (units <= 0n || units > MaxUint256) throw new Error('Amount must be positive and fit within uint256.')
  return units
}

export const getPaymentTotals = (payments: Payment[]): PaymentTotal[] => {
  const totals = new Map<string, PaymentTotal>()
  payments.forEach(({ tokenAddress, symbol, decimals, units }) => {
    const previous = totals.get(tokenAddress)
    totals.set(tokenAddress, {
      tokenAddress,
      symbol,
      decimals,
      units: (BigInt(previous?.units || 0) + BigInt(units)).toString(),
    })
  })
  return Array.from(totals.values())
}

export const validatePaymentCsv = async (
  csv: string,
  context: { chainId: string; chainName?: string; safeAddress: string; shortName: string },
  resolver: PaymentResolver,
): Promise<{ batch?: BatchPaymentsData; issues: ImportIssue[] }> => {
  const { rows, issues } = parsePaymentCsv(csv, context.shortName)
  if (issues.length) return { issues }
  const tokens = new Map<string, Promise<TokenDetails>>()
  const recipients = new Map<string, Promise<string | null>>()
  const payments: Payment[] = []
  for (let offset = 0; offset < rows.length; offset += 5) {
    const resolved = await Promise.all(
      rows.slice(offset, offset + 5).map(async (row) => {
        try {
          if (!recipients.has(row.recipient)) {
            recipients.set(
              row.recipient,
              isAddress(row.recipient)
                ? Promise.resolve(getAddress(row.recipient))
                : resolver.resolveName(row.recipient),
            )
          }
          const recipient = await recipients.get(row.recipient)
          if (!recipient || !isAddress(recipient) || recipient === ZeroAddress)
            throw new Error('Recipient must be a valid nonzero address or resolvable name.')
          if (!tokens.has(row.tokenAddress)) tokens.set(row.tokenAddress, resolver.getToken(row.tokenAddress))
          const token = await tokens.get(row.tokenAddress)!
          const units = parsePaymentAmount(row.amount, token.decimals)
          return {
            ...row,
            recipient: getAddress(recipient),
            recipientInput: row.recipient,
            decimals: token.decimals,
            symbol: token.symbol,
            units: units.toString(),
          }
        } catch (error) {
          issues.push({ row: row.row, message: error instanceof Error ? error.message : 'Unable to validate payment.' })
          return undefined
        }
      }),
    )
    payments.push(...resolved.filter((payment): payment is Payment => payment !== undefined))
  }
  if (issues.length) return { issues: issues.sort((a, b) => (a.row || 0) - (b.row || 0)) }
  const totals = getPaymentTotals(payments)
  for (const total of totals) {
    const token = await tokens.get(total.tokenAddress)!
    if (BigInt(total.units) > token.balance)
      issues.push({
        message: `Insufficient ${total.symbol} balance (${total.tokenAddress}) for all payments combined.`,
      })
  }
  if (issues.length) return { issues }
  const seen = new Set<string>()
  const duplicateRows = payments.flatMap((payment) => {
    const key = `${payment.recipient}:${payment.tokenAddress}:${payment.units}`
    const duplicate = seen.has(key)
    seen.add(key)
    return duplicate ? [payment.row] : []
  })
  return {
    batch: {
      csv,
      chainId: context.chainId,
      chainName: context.chainName,
      safeAddress: context.safeAddress,
      recipients: payments,
      totals,
      duplicateRows,
    },
    issues: [],
  }
}

export const buildPaymentCalls = (payments: Payment[]) =>
  payments.map((payment) => {
    if (!isAddress(payment.recipient) || payment.recipient === ZeroAddress || !isAddress(payment.tokenAddress))
      throw new Error('Invalid payment address.')
    const units = parsePaymentAmount(payment.amount, payment.decimals)
    if (units.toString() !== payment.units) throw new Error('Payment amount changed. Import the CSV again.')
    return createTokenTransferParams(payment.recipient, payment.amount, payment.decimals, payment.tokenAddress)
  })

export const revalidateBatch = async (batch: BatchPaymentsData, resolver: PaymentResolver) => {
  for (const total of getPaymentTotals(batch.recipients)) {
    const token = await resolver.getToken(total.tokenAddress)
    if (token.decimals !== total.decimals) throw new Error('Token decimals changed. Import the CSV again.')
    if (BigInt(total.units) > token.balance) throw new Error(`Insufficient ${total.symbol} balance for this batch.`)
  }
}
