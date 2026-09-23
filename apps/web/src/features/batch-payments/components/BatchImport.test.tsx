import { act, fireEvent, render, screen, waitFor } from '@/tests/test-utils'
import { BatchImport } from './BatchImport'
import { exampleBatch } from './fixtures'

describe('BatchImport', () => {
  it('requires validation and displays all payments before continuing', async () => {
    const onContinue = jest.fn()
    const validate = jest.fn().mockResolvedValue({ batch: exampleBatch, issues: [] })
    render(<BatchImport validate={validate} onContinue={onContinue} />)
    expect(screen.getByText('Validate CSV')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Payment CSV'), { target: { value: exampleBatch.csv } })
    fireEvent.click(screen.getByText('Validate CSV'))
    await screen.findByText('Review transaction')
    expect(screen.getByText('1 payment to 1 recipient')).toBeInTheDocument()
    expect(onContinue).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Review transaction'))
    expect(onContinue).toHaveBeenCalledWith(exampleBatch)
  })

  it('discards an old validation result after editing the CSV', async () => {
    let finish: (value: { batch: typeof exampleBatch; issues: [] }) => void = () => {}
    const validate = jest.fn(
      () =>
        new Promise<{ batch: typeof exampleBatch; issues: [] }>((resolve) => {
          finish = resolve
        }),
    )
    render(<BatchImport initialCsv={exampleBatch.csv} validate={validate} onContinue={jest.fn()} />)
    fireEvent.click(screen.getByText('Validate CSV'))
    fireEvent.change(screen.getByLabelText('Payment CSV'), { target: { value: 'edited' } })
    await act(async () => finish({ batch: exampleBatch, issues: [] }))
    expect(screen.queryByText('Review transaction')).not.toBeInTheDocument()
  })

  it('invalidates the preview whenever the CSV changes', async () => {
    render(
      <BatchImport
        initialCsv={exampleBatch.csv}
        validate={jest.fn().mockResolvedValue({ batch: exampleBatch, issues: [] })}
        onContinue={jest.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Validate CSV'))
    await screen.findByText('Review transaction')
    fireEvent.change(screen.getByLabelText('Payment CSV'), { target: { value: 'invalid' } })
    expect(screen.queryByText('Review transaction')).not.toBeInTheDocument()
  })

  it('blocks partial results, shows row errors and allows retry', async () => {
    const validate = jest
      .fn()
      .mockResolvedValueOnce({ batch: exampleBatch, issues: [{ row: 3, message: 'Invalid address' }] })
      .mockResolvedValueOnce({ batch: exampleBatch, issues: [] })
    render(<BatchImport initialCsv={exampleBatch.csv} validate={validate} onContinue={jest.fn()} />)
    fireEvent.click(screen.getByText('Validate CSV'))
    await screen.findByText('Row 3: Invalid address')
    expect(screen.queryByText('Review transaction')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Validate CSV'))
    await screen.findByText('Review transaction')
  })

  it('handles validation failure without leaving the button busy', async () => {
    render(
      <BatchImport
        initialCsv={exampleBatch.csv}
        validate={jest.fn().mockRejectedValue(new Error('offline'))}
        onContinue={jest.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Validate CSV'))
    await screen.findByText(/Unable to validate payments/)
    expect(screen.getByText('Validate CSV')).toBeEnabled()
  })

  it('loads an uploaded file and rejects files larger than 1 MB', async () => {
    render(<BatchImport validate={jest.fn()} onContinue={jest.fn()} />)
    const file = new File([exampleBatch.csv], 'payments.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(exampleBatch.csv) })
    fireEvent.change(screen.getByLabelText('Upload CSV'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByLabelText('Payment CSV')).toHaveValue(exampleBatch.csv))
    const huge = new File(['x'.repeat(1024 * 1024 + 1)], 'huge.csv')
    fireEvent.change(screen.getByLabelText('Upload CSV'), { target: { files: [huge] } })
    await screen.findByText('CSV must be 1 MB or smaller.')
    expect(screen.getByLabelText('Payment CSV')).toHaveValue('')
  })
})
