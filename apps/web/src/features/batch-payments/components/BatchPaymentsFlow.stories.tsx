import type { Meta, StoryObj } from '@storybook/react'
import { createMockStory, createChainData, coreHandlers } from '@/stories/mocks'
import { BatchPaymentsFlow } from './BatchPaymentsFlow'

const setup = createMockStory({ scenario: 'efSafe', wallet: 'owner', layout: 'none' })
const chain = createChainData()
const meta = {
  title: 'Features/Batch payments/BatchPaymentsFlow',
  component: BatchPaymentsFlow,
  parameters: {
    ...setup.parameters,
    msw: {
      handlers: [...coreHandlers({ ...chain, features: [...chain.features, 'BATCH_PAYMENTS'] }), ...setup.handlers],
    },
  },
  decorators: [setup.decorator],
} satisfies Meta<typeof BatchPaymentsFlow>
export default meta
type Story = StoryObj<typeof meta>
export const Import: Story = {}
