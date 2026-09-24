import { fireEvent, render, screen } from '@/tests/test-utils'
import { BatchPreview } from './BatchPreview'
import { exampleBatch } from './fixtures'

describe('BatchPreview', () => {
  it('paginates every payment and shows exact totals and duplicate warnings', () => {
    const batch = {
      ...exampleBatch,
      recipients: Array.from({ length: 21 }, (_, index) => ({ ...exampleBatch.recipients[0], row: index + 2 })),
      duplicateRows: [3],
    }
    render(<BatchPreview batch={batch} />)
    expect(screen.getByText(batch.safeAddress)).toBeInTheDocument()
    expect(screen.getByText(/chain ID 1/)).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText(/Repeated payments on rows 3/)).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(21)
    fireEvent.click(screen.getByText('Next page'))
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.getByText('Next page')).toBeDisabled()
    fireEvent.click(screen.getByText('Previous'))
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })
})
