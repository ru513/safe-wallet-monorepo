import { parse } from 'papaparse'
import { getAddress, isAddress, ZeroAddress } from 'ethers'
import type { ImportIssue, PaymentRow } from '../types'

export const MAX_PAYMENTS = 500
export const MAX_CSV_BYTES = 1024 * 1024
const HEADERS = ['token_type', 'token_address', 'receiver', 'amount', 'value', 'id']

const normalizeRecipient = (value: string, shortName: string): string => {
  if (!value.includes(':')) return value
  const [prefix, address, extra] = value.split(':')
  if (prefix !== shortName || extra !== undefined) throw new Error('Recipient chain prefix must match this network.')
  return address
}

const parseRow = (cells: string[], headers: string[], row: number, shortName: string): PaymentRow => {
  if (cells.length !== headers.length) throw new Error('The number of values must match the header.')
  const values = Object.fromEntries(headers.map((header, index) => [header, cells[index].trim()]))
  const tokenType = values.token_type?.toLowerCase()
  if (tokenType && !['native', 'erc20'].includes(tokenType))
    throw new Error('Only native tokens and ERC20s are supported.')
  if (values.id) throw new Error('NFT token IDs are not supported. Leave id blank for native tokens and ERC20s.')
  if (!values.receiver) throw new Error('Recipient is required.')
  if (cells.some((cell) => cell.length > 256)) throw new Error('A value is too long (maximum 256 characters).')
  const tokenAddress = values.token_address || ZeroAddress
  if (!isAddress(tokenAddress)) throw new Error('Invalid token address.')
  if (tokenType === 'native' && tokenAddress !== ZeroAddress)
    throw new Error('Leave the token address blank for native tokens.')
  if (tokenType === 'erc20' && tokenAddress === ZeroAddress) throw new Error('ERC20 transfers require a token address.')
  const amount = values.amount || values.value || ''
  if (values.amount && values.value && values.amount !== values.value) throw new Error('Amount and value disagree.')
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error('Enter an amount using digits and an optional decimal point.')
  return {
    row,
    recipient: normalizeRecipient(values.receiver, shortName),
    tokenAddress: getAddress(tokenAddress),
    amount,
  }
}

export const parsePaymentCsv = (csv: string, shortName: string): { rows: PaymentRow[]; issues: ImportIssue[] } => {
  if (new TextEncoder().encode(csv).length > MAX_CSV_BYTES)
    return { rows: [], issues: [{ message: 'CSV must be 1 MB or smaller.' }] }
  const source = csv.replace(/^\uFEFF/, '')
  const records: { cells: string[]; row: number }[] = []
  const issues: ImportIssue[] = []
  let offset = 0
  let line = 1
  parse<string[]>(source, {
    delimiter: ',',
    step: ({ data: cells, errors, meta }) => {
      const row = line
      line += (source.slice(offset, meta.cursor).match(/\r\n|\r|\n/g) || []).length
      offset = meta.cursor
      issues.push(...errors.map((error) => ({ row, message: error.message })))
      if (cells.some((cell) => cell.trim())) records.push({ cells, row })
    },
  })
  const [header, ...data] = records
  const headers = (header?.cells || []).map((cell) => cell.trim())
  if (new Set(headers).size !== headers.length || headers.some((header) => !HEADERS.includes(header))) {
    issues.push({ message: 'Headers must be unique and use token_type, token_address, receiver, amount, value or id.' })
  }
  if (
    !headers.includes('receiver') ||
    !headers.includes('token_address') ||
    !headers.some((header) => ['amount', 'value'].includes(header))
  ) {
    issues.push({ message: 'Required headers: token_address, receiver and amount (or value).' })
  }
  if (!data.length || data.length > MAX_PAYMENTS)
    issues.push({ message: `Include between 1 and ${MAX_PAYMENTS} payments.` })
  if (issues.length) return { rows: [], issues }
  const rows = data.flatMap(({ cells, row }) => {
    try {
      return [parseRow(cells, headers, row, shortName)]
    } catch (error) {
      issues.push({ row, message: (error as Error).message })
      return []
    }
  })
  return { rows: issues.length ? [] : rows, issues }
}
