import { MAX_CSV_BYTES, MAX_PAYMENTS, parsePaymentCsv } from './parseCsv'
import { ZeroAddress } from 'ethers'
import { faker } from '@faker-js/faker'

const recipient = faker.finance.ethereumAddress().toLowerCase()
const header = 'token_address,receiver,amount'

describe('parsePaymentCsv', () => {
  it('accepts BOM, CRLF, blank lines and quoted fields without changing amount precision', () => {
    const result = parsePaymentCsv(`\uFEFF${header}\r\n,"${recipient}",0.000000000000000001\r\n\r\n`, 'eth')
    expect(result.issues).toEqual([])
    expect(result.rows).toEqual([{ row: 2, tokenAddress: ZeroAddress, recipient, amount: '0.000000000000000001' }])
  })

  it('supports the value alias and matching chain prefixes', () => {
    expect(parsePaymentCsv(`token_address,receiver,value\n,eth:${recipient},1`, 'eth').rows[0]).toMatchObject({
      amount: '1',
      recipient,
    })
  })

  it('accepts the original five-column template with empty fungible token IDs', () => {
    const result = parsePaymentCsv(
      `token_type,token_address,receiver,amount,id\nnative,,${recipient},1,\nerc20,${recipient},${recipient},2,`,
      'eth',
    )
    expect(result.issues).toEqual([])
    expect(result.rows).toHaveLength(2)
  })

  it.each(['\n', '\r\n', '\r'])('reports physical rows after blank and quoted multiline records with %j', (newline) => {
    const csv = [header, '', `,"${newline}${recipient}",1`, '', `,${recipient},bad`].join(newline)
    const result = parsePaymentCsv(csv, 'eth')
    expect(result.rows).toEqual([])
    expect(result.issues).toEqual([{ row: 6, message: expect.stringContaining('amount') }])
    expect(parsePaymentCsv([header, '', `,${recipient},1`].join(newline), 'eth').rows[0].row).toBe(3)
  })

  it.each(['erc721', 'erc1155', 'nft'])('rejects %s in the original template', (type) => {
    expect(
      parsePaymentCsv(`token_type,token_address,receiver,amount,id\n${type},${recipient},${recipient},1,42`, 'eth')
        .rows,
    ).toEqual([])
  })

  it.each(['memo', 'decimals'])('rejects unsupported column %s', (column) => {
    expect(parsePaymentCsv(`${header},${column}\n,${recipient},1,`, 'eth').issues.length).toBeGreaterThan(0)
  })

  it('does not treat the original id column as a payment amount', () => {
    const result = parsePaymentCsv(`token_address,receiver,id\n,${recipient},`, 'eth')
    expect(result.rows).toEqual([])
    expect(result.issues).toContainEqual({
      message: 'Required headers: token_address, receiver and amount (or value).',
    })
  })

  it.each([
    ['missing recipient', `${header}\n,,1`],
    ['missing header', `receiver,amount\n${recipient},1`],
    ['duplicate header', `token_address,receiver,amount,amount\n,${recipient},1,2`],
    ['extra column', `${header}\n,${recipient},1,2`],
    ['missing column', `${header}\n,${recipient}`],
    ['nonempty NFT id', `token_address,receiver,amount,id\n,${recipient},1,1`],
    ['wrong prefix', `${header}\n,gno:${recipient},1`],
    ['malformed prefix', `${header}\n,eth:eth:${recipient},1`],
    ['scientific notation', `${header}\n,${recipient},1e3`],
    ['spreadsheet formula', `${header}\n,${recipient},=1+1`],
    ['negative amount', `${header}\n,${recipient},-1`],
    ['nonfinite amount', `${header}\n,${recipient},Infinity`],
    ['bad token', `${header}\n,${recipient},1\nnot-a-token,${recipient},1`],
    ['NFT', `token_type,${header}\nerc721,,${recipient},1`],
    ['unknown token type', `token_type,${header}\nerc200,,${recipient},1`],
    ['conflicting native token address', `token_type,${header}\nnative,${recipient},${recipient},1`],
    ['ERC20 without address', `token_type,${header}\nerc20,,${recipient},1`],
    ['conflicting amounts', `token_address,receiver,amount,value\n,${recipient},1,2`],
    ['empty file', ''],
    ['headers only', header],
    ['malformed quotes', `${header}\n,"${recipient},1`],
  ])('rejects %s without returning a partial batch', (_, csv) => {
    const result = parsePaymentCsv(csv, 'eth')
    expect(result.rows).toEqual([])
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('accepts 500 payments but rejects 501 and oversized input', () => {
    const rows = Array.from({ length: MAX_PAYMENTS }, () => `,${recipient},1`)
    expect(parsePaymentCsv([header, ...rows].join('\n'), 'eth').rows).toHaveLength(MAX_PAYMENTS)
    expect(parsePaymentCsv([header, ...rows, rows[0]].join('\n'), 'eth').rows).toHaveLength(0)
    expect(parsePaymentCsv('x'.repeat(MAX_CSV_BYTES + 1), 'eth').issues[0].message).toMatch(/1 MB/)
  })
})
