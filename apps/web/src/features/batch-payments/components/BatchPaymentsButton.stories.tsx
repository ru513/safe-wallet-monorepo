import type { Meta, StoryObj } from '@storybook/react'
import { createMockStory } from '@/stories/mocks'
import { BatchPaymentsButton } from './BatchPaymentsButton'

const setup = createMockStory({ scenario: 'efSafe', wallet: 'owner', layout: 'paper' })
const meta = {
  title: 'Features/Batch payments/BatchPaymentsButton',
  component: BatchPaymentsButton,
  parameters: setup.parameters,
  decorators: [setup.decorator],
} satisfies Meta<typeof BatchPaymentsButton>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
