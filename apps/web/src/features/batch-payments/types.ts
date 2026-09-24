export type PaymentRow = {
  row: number
  recipient: string
  tokenAddress: string
  amount: string
}

export type Payment = PaymentRow & {
  recipientInput: string
  decimals: number
  symbol: string
  units: string
}

export type PaymentTotal = {
  tokenAddress: string
  symbol: string
  decimals: number
  units: string
}

export type BatchPaymentsData = {
  csv: string
  chainId: string
  chainName?: string
  safeAddress: string
  recipients: Payment[]
  totals: PaymentTotal[]
  duplicateRows: number[]
}

export type ImportIssue = { row?: number; message: string }

export type TokenDetails = { decimals: number; symbol: string; balance: bigint }

export type PaymentResolver = {
  getToken: (address: string) => Promise<TokenDetails>
  resolveName: (name: string) => Promise<string | null>
}
