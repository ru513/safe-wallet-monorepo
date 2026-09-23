import { useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { TxFlowContext, type TxFlowContextType } from '@/components/tx-flow/TxFlowProvider'
import ReviewTransaction from '@/components/tx/ReviewTransactionV2'
import ReviewTransactionSkeleton from '@/components/tx/ReviewTransactionV2/ReviewTransactionSkeleton'
import { createMultiSendCallOnlyTx } from '@/services/tx/tx-sender'
import { useSafeShieldForRecipients } from '@/features/safe-shield/SafeShieldContext'
import { useHasPermission } from '@/permissions/hooks/useHasPermission'
import { Permission } from '@/permissions/config'
import { BatchPreview } from './BatchPreview'
import { buildPaymentCalls, revalidateBatch } from '../services/validatePayments'
import { usePaymentResolver } from '../hooks/usePaymentResolver'
import type { BatchPaymentsData } from '../types'
import TxCard from '@/components/tx-flow/common/TxCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function ReviewBatchPayments({ children, onSubmit }: PropsWithChildren<{ onSubmit: () => void }>) {
  const { data: batch, txNonce } = useContext(TxFlowContext) as TxFlowContextType<BatchPaymentsData>
  const { safeTx, safeTxError, setSafeTx, setSafeTxError, setNonce } = useContext(SafeTxContext)
  const [attempt, setAttempt] = useState(0)
  const [prepared, setPrepared] = useState(false)
  const getResolver = usePaymentResolver()
  const canCreate = useHasPermission(Permission.CreateTransaction)
  const recipients = useMemo(() => Array.from(new Set(batch?.recipients.map((payment) => payment.recipient))), [batch])
  useSafeShieldForRecipients(recipients)

  useEffect(() => {
    let cancelled = false
    setPrepared(false)
    setSafeTx(undefined)
    setSafeTxError(undefined)
    if (txNonce !== undefined) setNonce(txNonce)
    const prepare = async () => {
      if (!canCreate || !batch?.recipients.length) throw new Error('Import and validate payments before continuing.')
      const { context, resolver } = await getResolver()
      if (context.chainId !== batch.chainId || context.safeAddress !== batch.safeAddress)
        throw new Error('Safe or network changed. Import the CSV again.')
      await revalidateBatch(batch, resolver)
      if (cancelled) return
      const transaction = await createMultiSendCallOnlyTx(buildPaymentCalls(batch.recipients))
      if (!cancelled) {
        setSafeTx(transaction)
        setPrepared(true)
      }
    }
    void prepare().catch((error) => {
      if (!cancelled) setSafeTxError(error)
    })
    return () => {
      cancelled = true
    }
  }, [batch, txNonce, getResolver, canCreate, setSafeTx, setSafeTxError, setNonce, attempt])

  if (safeTxError)
    return (
      <TxCard>
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>{safeTxError.message}</AlertDescription>
          </Alert>
          <Button type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>
            Retry validation
          </Button>
        </div>
      </TxCard>
    )
  if (!prepared) return <ReviewTransactionSkeleton />

  return (
    <ReviewTransaction
      onSubmit={() => {
        if (safeTx && canCreate) onSubmit()
      }}
    >
      {batch && <BatchPreview batch={batch} />}
      {children}
    </ReviewTransaction>
  )
}
