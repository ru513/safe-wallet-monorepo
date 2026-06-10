import type { TransactionDetails } from '@safe-global/store/gateway/AUTO_GENERATED/transactions'
import type { OperationType } from '@safe-global/types-kit'
import { type SafeTransactionData } from '@safe-global/types-kit'
import { generatePreValidatedSignature } from '@safe-global/protocol-kit'
import { Operation } from '@safe-global/store/gateway/types'
import { isMultisigDetailedExecutionInfo } from '@/utils/transaction-guards'

const ZERO_ADDRESS: string = '0x0000000000000000000000000000000000000000'

/**
 * Convert the CGW tx type to a Safe Core SDK tx
 */
const extractTxInfo = (
  txDetails: TransactionDetails,
): { txParams: SafeTransactionData; signatures: Record<string, string> } => {
  const execInfo = isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)
    ? txDetails.detailedExecutionInfo
    : undefined
  const txData = txDetails?.txData

  // Format signatures into a map. CGW returns `signature: null` for confirmations
  // recorded via on-chain `approveHash`; represent those as pre-validated signatures
  // (v=1, r=signer) so they count toward the threshold AND contribute valid bytes to
  // the encoded blob. Empty-string entries trigger GS020 in `execTransaction`, while
  // dropping them would unlock editing of already-approved transactions.
  const signatures =
    execInfo?.confirmations.reduce(
      (result, item) => {
        result[item.signer.value] = item.signature || generatePreValidatedSignature(item.signer.value).data
        return result
      },
      {} as Record<string, string>,
    ) ?? {}

  const nonce = execInfo?.nonce ?? 0
  const baseGas = execInfo?.baseGas ?? '0'
  const gasPrice = execInfo?.gasPrice ?? '0'
  const safeTxGas = execInfo?.safeTxGas ?? '0'
  const gasToken = execInfo?.gasToken ?? ZERO_ADDRESS
  const refundReceiver = execInfo?.refundReceiver.value ?? ZERO_ADDRESS

  const to = txData?.to.value ?? ZERO_ADDRESS
  const value = txData?.value ?? '0'
  const data = txData?.hexData ?? '0x'
  const operation = (txData?.operation ?? Operation.CALL) as unknown as OperationType

  return {
    txParams: {
      data,
      baseGas,
      gasPrice,
      safeTxGas,
      gasToken,
      nonce,
      refundReceiver,
      value,
      to,
      operation,
    },
    signatures,
  }
}

export default extractTxInfo
