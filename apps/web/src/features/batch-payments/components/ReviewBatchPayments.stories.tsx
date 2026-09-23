import { useContext } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { createMockStory } from '@/stories/mocks'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { initialContext, TxFlowContext } from '@/components/tx-flow/TxFlowProvider'
import { SafeShieldProvider } from '@/features/safe-shield/SafeShieldContext'
import { ReviewBatchPayments } from './ReviewBatchPayments'
import { exampleBatch } from './fixtures'

const setup = createMockStory({ scenario: 'efSafe', wallet: 'owner', layout: 'paper' })

function FailedReview() {
  const context = useContext(SafeTxContext)
  return (
    <SafeTxContext.Provider value={{ ...context, safeTxError: new Error('Insufficient ETH balance for this batch.') }}>
      <TxFlowContext.Provider value={{ ...initialContext, data: exampleBatch }}>
        <SafeShieldProvider>
          <ReviewBatchPayments onSubmit={() => {}} />
        </SafeShieldProvider>
      </TxFlowContext.Provider>
    </SafeTxContext.Provider>
  )
}

const meta = {
  title: 'Features/Batch payments/ReviewBatchPayments',
  component: FailedReview,
  parameters: setup.parameters,
  decorators: [setup.decorator],
} satisfies Meta<typeof FailedReview>
export default meta
type Story = StoryObj<typeof meta>
export const InsufficientBalance: Story = {}
