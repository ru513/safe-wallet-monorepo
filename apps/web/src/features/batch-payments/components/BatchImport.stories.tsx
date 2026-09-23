import type { Meta, StoryObj } from '@storybook/react'
import { BatchImport } from './BatchImport'
import { exampleBatch } from './fixtures'

const meta = {
  title: 'Features/Batch payments/BatchImport',
  component: BatchImport,
  args: { validate: async () => ({ batch: exampleBatch, issues: [] }), onContinue: () => {} },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-3xl p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BatchImport>
export default meta
type Story = StoryObj<typeof BatchImport>

export const Empty: Story = {}
export const PastedCsv: Story = { args: { initialCsv: exampleBatch.csv } }
export const InvalidCsv: Story = {
  args: {
    initialCsv: 'token_address,receiver,amount\n,invalid,1',
    validate: async () => ({
      issues: [{ row: 2, message: 'Recipient must be a valid nonzero address or resolvable name.' }],
    }),
  },
}
export const Unavailable: Story = { args: { disabled: true } }
