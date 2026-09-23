import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { Interface, JsonRpcProvider, ZeroAddress } from 'ethers'
import { createPaymentResolver } from './paymentResolver'
import { MULTICALL_ABI } from '@safe-global/utils/utils/multicall'

const url = 'http://batch-payments-rpc.test'
const abi = new Interface([
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
])
const server = setupServer()
const multicallInterface = new Interface(MULTICALL_ABI)
const context = {
  chainId: '1',
  safeAddress: '0x1111111111111111111111111111111111111111',
  nativeSymbol: 'ETH',
  nativeDecimals: 18,
  resolveNames: false,
}
type RpcRequest = { id: number; method: string; params: [{ data: string }] }

describe('createPaymentResolver', () => {
  let provider: JsonRpcProvider
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    provider = new JsonRpcProvider(url, 1, { staticNetwork: true, batchMaxCount: 1 })
    server.use(
      http.post(url, async ({ request }) => {
        const body = (await request.json()) as RpcRequest
        if (body.method === 'eth_getBalance') return HttpResponse.json({ id: body.id, jsonrpc: '2.0', result: '0x64' })
        if (body.params[0].data.startsWith(multicallInterface.getFunction('aggregate3')!.selector)) {
          const calls = multicallInterface.decodeFunctionData('aggregate3', body.params[0].data)[0] as Array<{
            callData: string
          }>
          const results = calls.map(({ callData }) => {
            const call = abi.parseTransaction({ data: callData })!
            return {
              success: true,
              returnData: abi.encodeFunctionResult(call.name, [call.name === 'decimals' ? 6 : 'TEST']),
            }
          })
          return HttpResponse.json({
            id: body.id,
            jsonrpc: '2.0',
            result: multicallInterface.encodeFunctionResult('aggregate3', [results]),
          })
        }
        const call = abi.parseTransaction({ data: body.params[0].data })!
        const values: Record<string, string | number | bigint> = { decimals: 6, symbol: 'TEST', balanceOf: 1234567n }
        return HttpResponse.json({
          id: body.id,
          jsonrpc: '2.0',
          result: abi.encodeFunctionResult(call.name, [values[call.name]]),
        })
      }),
    )
  })
  afterEach(() => {
    provider.destroy()
    server.resetHandlers()
  })

  it('reads native and unlisted ERC20 balances directly using Wallet RPC', async () => {
    const resolver = await createPaymentResolver(provider, context)
    await expect(resolver.getToken(ZeroAddress)).resolves.toEqual({ decimals: 18, symbol: 'ETH', balance: 100n })
    await expect(resolver.getToken('0x2222222222222222222222222222222222222222')).resolves.toEqual({
      decimals: 6,
      symbol: 'TEST',
      balance: 1234567n,
    })
    await expect(resolver.resolveName('alice.eth')).resolves.toBeNull()
  })

  it('blocks a provider from another network', async () => {
    await expect(createPaymentResolver(provider, { ...context, chainId: '100' })).rejects.toThrow(/Network changed/)
  })

  it('reports RPC failure instead of inventing token metadata or a zero balance', async () => {
    server.use(
      http.post(url, async ({ request }) => {
        const body = (await request.json()) as RpcRequest
        return HttpResponse.json({
          id: body.id,
          jsonrpc: '2.0',
          error: { code: -32000, message: 'execution reverted' },
        })
      }),
    )
    const resolver = await createPaymentResolver(provider, context)
    await expect(resolver.getToken('0x2222222222222222222222222222222222222222')).rejects.toThrow(
      /Unable to read token metadata/,
    )
  })
})
