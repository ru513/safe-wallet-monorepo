import type { TransactionDetails } from '@safe-global/store/gateway/AUTO_GENERATED/transactions'
import { generatePreValidatedSignature } from '@safe-global/protocol-kit'
import extractTxInfo from '../extractTxInfo'

describe('extractTxInfo', () => {
  it('should extract tx info for an ETH transfer', () => {
    const txDetails = {
      txData: {
        operation: 'CALL',
        to: { value: '0x1234567890123456789012345678901234567890' },
        value: '1000000000000000000',
        data: '0x1234567890123456789012345678901234567890',
      },
      txInfo: {
        type: 'Transfer',
        transferInfo: {
          type: 'ERC20',
          value: '1000000000000000000',
          tokenAddress: '0x1234567890123456789012345678901234567890',
        },
        recipient: {
          value: '0x1234567890123456789012345678901234567890',
        },
      },
      detailedExecutionInfo: {
        type: 'MULTISIG',
        baseGas: '21000',
        gasPrice: '10000000000',
        safeTxGas: '11000',
        gasToken: '0x0000000000000000000000000000000000000000',
        nonce: 0,

        refundReceiver: {
          type: 'Address',
          value: '0x1234567890123456789012345678901234567890',
        },
        confirmations: [{ signer: { value: '0x1234567890123456789012345678901234567890' }, signature: '0x123' }],
      },
    } as unknown as TransactionDetails

    expect(extractTxInfo(txDetails)).toEqual({
      txParams: {
        data: '0x',
        baseGas: '21000',
        gasPrice: '10000000000',
        safeTxGas: '11000',
        gasToken: '0x0000000000000000000000000000000000000000',
        nonce: 0,
        refundReceiver: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        to: '0x1234567890123456789012345678901234567890',
        operation: 'CALL',
      },
      signatures: {
        '0x1234567890123456789012345678901234567890': '0x123',
      },
    })
  })

  it('should extract tx info for an ERC20 token transfer', () => {
    const txDetails = {
      txData: {
        to: { value: '0xa74476443119A942dE498590Fe1f2454d7D4aC0d' },
        operation: 'CALL',
        value: '0x0',
        hexData: '0x546785',
        data: '0x1234567890123456789012345678901234567890',
      },
      txInfo: {
        type: 'Transfer',
        transferInfo: {
          type: 'ERC20',
          value: '1000000000000000000',
          tokenAddress: '0xa74476443119A942dE498590Fe1f2454d7D4aC0d',
        },
        recipient: {
          value: '0x1234567890123456789012345678901234567890',
        },
      },
      detailedExecutionInfo: {
        type: 'MULTISIG',
        baseGas: '21000',
        gasPrice: '10000000000',
        safeTxGas: '11000',
        gasToken: '0x0000000000000000000000000000000000000000',
        nonce: 0,

        refundReceiver: {
          type: 'Address',
          value: '0x1234567890123456789012345678901234567890',
        },
        confirmations: [{ signer: { value: '0x1234567890123456789012345678901234567890' }, signature: '0x123' }],
      },
    } as unknown as TransactionDetails

    expect(extractTxInfo(txDetails)).toEqual({
      txParams: {
        data: '0x546785',
        baseGas: '21000',
        gasPrice: '10000000000',
        safeTxGas: '11000',
        gasToken: '0x0000000000000000000000000000000000000000',
        nonce: 0,
        refundReceiver: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        to: '0xa74476443119A942dE498590Fe1f2454d7D4aC0d',
        operation: 'CALL',
      },
      signatures: {
        '0x1234567890123456789012345678901234567890': '0x123',
      },
    })
  })

  it('should extract tx info for a swap order', () => {
    const txDetails = {
      safeAddress: '0xF979f34D16d865f51e2eC7baDEde4f3735DaFb7d',
      txId: 'multisig_0xF979f34D16d865f51e2eC7baDEde4f3735DaFb7d_0x8061c0374937f7c1722e3e305d9e364c84e06fadda806e36c0e09a110b806f42',
      executedAt: null,
      txStatus: 'AWAITING_EXECUTION',
      txInfo: {
        type: 'SwapOrder',
        humanDescription: null,
        richDecodedInfo: null,
        orderUid:
          '0xc062b80afd6bd050f3edc555c7e9c6af73432c5037ac4b579a244dfefd6d4a92f979f34d16d865f51e2ec7badede4f3735dafb7d662110c6',
        status: 'expired',
        orderKind: 'buy',
        sellToken: {
          logo: 'https://safe-transaction-assets.staging.5afe.dev/tokens/logos/0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14.png',
          symbol: 'WETH',
          amount: '0.00895526057385569',
        },
        buyToken: {
          logo: 'https://safe-transaction-assets.staging.5afe.dev/tokens/logos/0x0625aFB445C3B6B7B929342a04A22599fd5dBB59.png',
          symbol: 'COW',
          amount: '0.254',
        },
        expiresTimestamp: 1713443014,
        filledPercentage: '0.00',
        explorerUrl:
          'https://explorer.cow.fi/orders/0xc062b80afd6bd050f3edc555c7e9c6af73432c5037ac4b579a244dfefd6d4a92f979f34d16d865f51e2ec7badede4f3735dafb7d662110c6',
        limitPriceLabel: '1 WETH = 0.035256931393132636 COW',
      },
      txData: {
        hexData:
          '0xec6cb13f000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000038c062b80afd6bd050f3edc555c7e9c6af73432c5037ac4b579a244dfefd6d4a92f979f34d16d865f51e2ec7badede4f3735dafb7d662110c60000000000000000',
        dataDecoded: {
          method: 'setPreSignature',
          parameters: [
            {
              name: 'orderUid',
              type: 'bytes',
              value:
                '0xc062b80afd6bd050f3edc555c7e9c6af73432c5037ac4b579a244dfefd6d4a92f979f34d16d865f51e2ec7badede4f3735dafb7d662110c6',
            },
            { name: 'signed', type: 'bool', value: 'True' },
          ],
        },
        to: { value: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41', name: null, logoUri: null },
        value: '0',
        operation: 0,
        trustedDelegateCallTarget: null,
        addressInfoIndex: null,
      },
      txHash: null,
      detailedExecutionInfo: {
        type: 'MULTISIG',
        submittedAt: 1713441228191,
        nonce: 19,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: { value: '0x0000000000000000000000000000000000000000', name: null, logoUri: null },
        safeTxHash: '0x8061c0374937f7c1722e3e305d9e364c84e06fadda806e36c0e09a110b806f42',
        executor: null,
        signers: [
          { value: '0x3326c5D84bd462Ec1CadA0B5bBa9b2B85059FCba', name: null, logoUri: null },
          { value: '0xbbeedB6d8e56e23f5812e59d1b6602F15957271F', name: null, logoUri: null },
        ],
        confirmationsRequired: 1,
        confirmations: [
          {
            signer: { value: '0xbbeedB6d8e56e23f5812e59d1b6602F15957271F', name: null, logoUri: null },
            signature:
              '0xb10e0605bd27c42af87ff36d690a5594d13a4a7029ea5f080dde917d0781f97901958195d0d99c7805419adb636ccdc579e9aa200ee0443dd10c4f5885f37f081b',
            submittedAt: 1713441228230,
          },
        ],
        rejectors: [],
        gasTokenInfo: null,
        trusted: true,
        proposer: { value: '0xbbeedB6d8e56e23f5812e59d1b6602F15957271F', name: null, logoUri: null },
      },
      safeAppInfo: {
        name: 'CowSwap',
        url: 'https://cowswap.exchange/',
        logoUri: 'https://safe-transaction-assets.staging.5afe.dev/safe_apps/58/icon.png',
      },
    } as unknown as TransactionDetails

    expect(extractTxInfo(txDetails)).toEqual({
      signatures: {
        '0xbbeedB6d8e56e23f5812e59d1b6602F15957271F':
          '0xb10e0605bd27c42af87ff36d690a5594d13a4a7029ea5f080dde917d0781f97901958195d0d99c7805419adb636ccdc579e9aa200ee0443dd10c4f5885f37f081b',
      },
      txParams: {
        baseGas: '0',
        data: '0xec6cb13f000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000038c062b80afd6bd050f3edc555c7e9c6af73432c5037ac4b579a244dfefd6d4a92f979f34d16d865f51e2ec7badede4f3735dafb7d662110c60000000000000000',
        gasPrice: '0',
        gasToken: '0x0000000000000000000000000000000000000000',
        nonce: 19,
        operation: 0,
        refundReceiver: '0x0000000000000000000000000000000000000000',
        safeTxGas: '0',
        to: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
        value: '0',
      },
    })
  })

  it('should convert confirmations without an off-chain signature (e.g. on-chain approveHash) into pre-validated signatures', () => {
    // CGW returns `signature: null` for confirmations created via on-chain `approveHash`.
    // Including them with `''` data inflates `safeTx.signatures.size` while contributing
    // zero bytes to the encoded blob, triggering GS020 during gas estimation. As
    // pre-validated signatures (v=1, r=signer) they count toward the threshold and
    // validate on-chain via `approvedHashes`.
    const txDetails = {
      txData: {
        operation: 'CALL',
        to: { value: '0x1234567890123456789012345678901234567890' },
        value: '0',
        data: '0x',
      },
      txInfo: { type: 'Custom' },
      detailedExecutionInfo: {
        type: 'MULTISIG',
        baseGas: '0',
        gasPrice: '0',
        safeTxGas: '0',
        gasToken: '0x0000000000000000000000000000000000000000',
        nonce: 0,
        refundReceiver: { type: 'Address', value: '0x0000000000000000000000000000000000000000' },
        confirmations: [
          { signer: { value: '0xaaaa000000000000000000000000000000000001' }, signature: '0xabc' },
          { signer: { value: '0xbbbb000000000000000000000000000000000002' }, signature: null },
          { signer: { value: '0xcccc000000000000000000000000000000000003' }, signature: '' },
        ],
      },
    } as unknown as TransactionDetails

    const { signatures } = extractTxInfo(txDetails)
    expect(signatures).toEqual({
      '0xaaaa000000000000000000000000000000000001': '0xabc',
      '0xbbbb000000000000000000000000000000000002': generatePreValidatedSignature(
        '0xbbbb000000000000000000000000000000000002',
      ).data,
      '0xcccc000000000000000000000000000000000003': generatePreValidatedSignature(
        '0xcccc000000000000000000000000000000000003',
      ).data,
    })
  })
})
