import type { Meta, StoryObj } from '@storybook/react'
import { parseUnits } from 'ethers'
import { BatchPreview } from './BatchPreview'
import { exampleBatch } from './fixtures'

const meta = {
  title: 'Features/Batch payments/BatchPreview',
  component: BatchPreview,
  args: { batch: exampleBatch },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-3xl p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BatchPreview>
export default meta
type Story = StoryObj<typeof meta>

export const SinglePayment: Story = {}
export const LargeBatch: Story = {
  args: {
    batch: {
      ...exampleBatch,
      recipients: Array.from({ length: 45 }, (_, index) => ({ ...exampleBatch.recipients[0], row: index + 2 })),
      totals: [{ ...exampleBatch.totals[0], units: parseUnits('4.5').toString() }],
      duplicateRows: [3, 4, 5],
    },
  },
}
