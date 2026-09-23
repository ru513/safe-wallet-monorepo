import { useContext } from 'react'
import { TxFlow } from '@/components/tx-flow/TxFlow'
import { TxFlowStep } from '@/components/tx-flow/TxFlowStep'
import { TxFlowContext, type TxFlowContextType } from '@/components/tx-flow/TxFlowProvider'
import TxCard from '@/components/tx-flow/common/TxCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import AssetsIcon from '@/public/images/sidebar/assets.svg'
import useSafeInfo from '@/hooks/useSafeInfo'
import useChainId from '@/hooks/useChainId'
import { useHasPermission } from '@/permissions/hooks/useHasPermission'
import { Permission } from '@/permissions/config'
import { useHasFeature } from '@/hooks/useChains'
import { FEATURES } from '@safe-global/utils/utils/chains'
import { trackEvent } from '@/services/analytics'
import { BatchImport } from './BatchImport'
import { ReviewBatchPayments } from './ReviewBatchPayments'
import { usePaymentResolver } from '../hooks/usePaymentResolver'
import { validatePaymentCsv } from '../services/validatePayments'
import type { BatchPaymentsData } from '../types'

function ImportStep() {
  const { data, onNext } = useContext(TxFlowContext) as TxFlowContextType<BatchPaymentsData>
  const getResolver = usePaymentResolver()
  return (
    <TxCard>
      <BatchImport
        initialCsv={data?.csv}
        validate={async (csv) => {
          const { context, resolver } = await getResolver()
          return validatePaymentCsv(csv, context, resolver)
        }}
        onContinue={(batch) => {
          trackEvent({ category: 'batch-payments', action: 'CSV validated' })
          onNext(batch)
        }}
      />
    </TxCard>
  )
}

export function BatchPaymentsFlow({ txNonce }: { txNonce?: number }) {
  const { safeAddress, safe, safeLoaded } = useSafeInfo()
  const chainId = useChainId()
  const enabled = useHasFeature(FEATURES.BATCH_PAYMENTS)
  const canCreate = useHasPermission(Permission.CreateTransaction)
  if (!enabled || !canCreate || !safeLoaded || safe.chainId !== chainId)
    return (
      <Alert>
        <AlertDescription>Batch payments are unavailable for this Safe or network.</AlertDescription>
      </Alert>
    )
  return (
    <TxFlow
      key={`${chainId}:${safeAddress}`}
      txNonce={txNonce}
      icon={AssetsIcon}
      subtitle="Batch payments"
      eventCategory="batch-payments"
      ReviewTransactionComponent={ReviewBatchPayments}
      isBatchable={false}
    >
      <TxFlowStep title="Import CSV">
        <ImportStep />
      </TxFlowStep>
    </TxFlow>
  )
}
