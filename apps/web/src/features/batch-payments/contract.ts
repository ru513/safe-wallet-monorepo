import type { BatchPaymentsButton } from './components/BatchPaymentsButton'
import type { BatchPaymentsFlow } from './components/BatchPaymentsFlow'

export interface BatchPaymentsContract {
  BatchPaymentsButton: typeof BatchPaymentsButton
  BatchPaymentsFlow: typeof BatchPaymentsFlow
}
