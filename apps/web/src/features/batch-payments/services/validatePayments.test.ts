import { getAddress, Interface, MaxUint256, parseUnits, ZeroAddress } from 'ethers'
import { faker } from '@faker-js/faker'
import { buildPaymentCalls, parsePaymentAmount, revalidateBatch, validatePaymentCsv } from './validatePayments'
import type { PaymentResolver } from '../types'

const recipient = getAddress(faker.finance.ethereumAddress())
const tokenAddress = getAddress(faker.finance.ethereumAddress())
const context = { chainId: '1', safeAddress: getAddress(faker.finance.ethereumAddress()), shortName: 'eth' }
const header = 'token_address,receiver,amount'
const csv = `${header}\n,${recipient},0.1\n${tokenAddress},${recipient},1.123456\n,${recipient},0.2`
const makeResolver = (): PaymentResolver => ({
  getToken: jest.fn(async (address: string) => ({
    decimals: address === ZeroAddress ? 18 : 6,
    symbol: address === ZeroAddress ? 'ETH' : 'USDC',
    balance: parseUnits('10', address === ZeroAddress ? 18 : 6),
  })),
  resolveName: jest.fn(async () => recipient),
})

describe('validatePaymentCsv', () => {
  it('resolves each token once, sums exact units, and encodes every row in order', async () => {
    const resolver = makeResolver()
    const { batch, issues } = await validatePaymentCsv(csv, context, resolver)
    expect(issues).toEqual([])
    expect(resolver.getToken).toHaveBeenCalledTimes(2)
    expect(batch?.totals[0].units).toBe('300000000000000000')
    const calls = buildPaymentCalls(batch!.recipients)
    expect(calls).toEqual([
      { to: recipient, value: '100000000000000000', data: '0x' },
      {
        to: tokenAddress,
        value: '0',
        data: new Interface(['function transfer(address,uint256)']).encodeFunctionData('transfer', [
          recipient,
          1123456n,
        ]),
      },
      { to: recipient, value: '200000000000000000', data: '0x' },
    ])
  })

  it('rejects aggregate overspending even when each individual payment fits', async () => {
    const { batch, issues } = await validatePaymentCsv(
      `${header}\n,${recipient},6\n,${recipient},6`,
      context,
      makeResolver(),
    )
    expect(batch).toBeUndefined()
    expect(issues[0].message).toMatch(/Insufficient ETH/)
  })

  it('keeps repeated payments and warns instead of merging them', async () => {
    const { batch } = await validatePaymentCsv(
      `${header}\n,${recipient},1\n,${recipient.toLowerCase()},1.0`,
      context,
      makeResolver(),
    )
    expect(batch?.recipients).toHaveLength(2)
    expect(batch?.duplicateRows).toEqual([3])
    expect(batch?.totals[0].units).toBe(parseUnits('2').toString())
  })

  it('pins resolved names to addresses and caches repeated names', async () => {
    const resolver = makeResolver()
    const { batch } = await validatePaymentCsv(`${header}\n,alice.eth,1\n,alice.eth,2`, context, resolver)
    expect(resolver.resolveName).toHaveBeenCalledTimes(1)
    expect(batch?.recipients[0]).toMatchObject({ recipient, recipientInput: 'alice.eth' })
  })

  it.each(['0', '0.0000001', '-1', '1e3', (MaxUint256 + 1n).toString()])(
    'rejects invalid ERC20 amount %s',
    async (amount) => {
      const { batch, issues } = await validatePaymentCsv(
        `${header}\n${tokenAddress},${recipient},${amount}`,
        context,
        makeResolver(),
      )
      expect(batch).toBeUndefined()
      expect(issues).not.toHaveLength(0)
    },
  )

  it('returns row errors for missing metadata, unresolved names and zero recipients', async () => {
    const resolver = makeResolver()
    resolver.getToken = jest.fn().mockRejectedValue(new Error('Token unavailable'))
    resolver.resolveName = jest.fn().mockResolvedValue(null)
    const result = await validatePaymentCsv(
      `${header}\n${tokenAddress},${recipient},1\n,bad.eth,1\n,${ZeroAddress},1`,
      context,
      resolver,
    )
    expect(result.batch).toBeUndefined()
    expect(result.issues.map((issue) => issue.row)).toEqual([2, 3, 4])
  })

  it('bounds concurrent token lookups for large batches', async () => {
    let active = 0
    let maximum = 0
    const resolver = makeResolver()
    resolver.getToken = async () => {
      active++
      maximum = Math.max(maximum, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active--
      return { decimals: 18, symbol: 'TOKEN', balance: parseUnits('10') }
    }
    const rows = Array.from({ length: 30 }, () => `${faker.finance.ethereumAddress().toLowerCase()},${recipient},1`)
    const { batch } = await validatePaymentCsv([header, ...rows].join('\n'), context, resolver)
    expect(batch?.recipients).toHaveLength(30)
    expect(maximum).toBeLessThanOrEqual(5)
  })

  it('rechecks balances and metadata before building the Safe transaction', async () => {
    const resolver = makeResolver()
    const { batch } = await validatePaymentCsv(csv, context, resolver)
    resolver.getToken = jest.fn(async () => ({ decimals: 18, symbol: 'ETH', balance: 0n }))
    await expect(revalidateBatch(batch!, resolver)).rejects.toThrow(/Insufficient/)
    resolver.getToken = jest.fn(async () => ({ decimals: 8, symbol: 'ETH', balance: parseUnits('100') }))
    await expect(revalidateBatch(batch!, resolver)).rejects.toThrow(/decimals changed/)
  })

  it('refuses to encode a payment whose units no longer match the reviewed amount', async () => {
    const { batch } = await validatePaymentCsv(csv, context, makeResolver())
    expect(() => buildPaymentCalls([{ ...batch!.recipients[0], units: '1' }])).toThrow(/changed/)
  })

  it('validates uint256 and decimal boundaries without rounding', () => {
    expect(parsePaymentAmount(MaxUint256.toString(), 0)).toBe(MaxUint256)
    expect(parsePaymentAmount('0.000000000000000001', 18)).toBe(1n)
    expect(() => parsePaymentAmount('1.0000000', 6)).toThrow()
    expect(() => parsePaymentAmount('1', 256)).toThrow()
  })
})
