import { useContext } from 'react'
import { Button } from '@/components/ui/button'
import { TxModalContext } from '@/components/tx-flow'
import { useHasPermission } from '@/permissions/hooks/useHasPermission'
import { Permission } from '@/permissions/config'
import { BatchPaymentsFlow } from './BatchPaymentsFlow'
import { trackEvent } from '@/services/analytics'

export function BatchPaymentsButton({ txNonce }: { txNonce?: number }) {
  const { setTxFlow } = useContext(TxModalContext)
  const canCreate = useHasPermission(Permission.CreateTransaction)
  if (!canCreate) return null
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        trackEvent({ category: 'batch-payments', action: 'Import CSV opened' })
        setTxFlow(<BatchPaymentsFlow txNonce={txNonce} />)
      }}
    >
      Import CSV
    </Button>
  )
}
