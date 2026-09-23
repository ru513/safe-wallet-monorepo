import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { BatchPreview } from './BatchPreview'
import { MAX_CSV_BYTES, MAX_PAYMENTS } from '../services/parseCsv'
import type { BatchPaymentsData, ImportIssue } from '../types'

const EXAMPLE = 'token_address,receiver,amount\n,0x1234567890123456789012345678901234567890,0.01\n'

export type BatchImportProps = {
  initialCsv?: string
  disabled?: boolean
  validate: (csv: string) => Promise<{ batch?: BatchPaymentsData; issues: ImportIssue[] }>
  onContinue: (batch: BatchPaymentsData) => void
}

export function BatchImport({ initialCsv = '', disabled, validate, onContinue }: BatchImportProps) {
  const [csv, setCsv] = useState(initialCsv)
  const [batch, setBatch] = useState<BatchPaymentsData>()
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [busy, setBusy] = useState(false)
  const revision = useRef(0)
  useEffect(
    () => () => {
      revision.current += 1
    },
    [],
  )

  const updateCsv = (value: string) => {
    revision.current += 1
    setCsv(value)
    setBatch(undefined)
    setIssues([])
    setBusy(false)
  }

  const upload = async (file?: File) => {
    if (!file) return
    updateCsv('')
    if (file.size > MAX_CSV_BYTES) {
      setIssues([{ message: 'CSV must be 1 MB or smaller.' }])
      return
    }
    const request = revision.current
    setBusy(true)
    try {
      const text = await file.text()
      if (request === revision.current) updateCsv(text)
    } catch {
      if (request === revision.current)
        setIssues([{ message: 'Unable to read the file. Try uploading it again or paste the CSV.' }])
    } finally {
      if (request === revision.current) setBusy(false)
    }
  }

  const review = async () => {
    const request = ++revision.current
    setBusy(true)
    setBatch(undefined)
    setIssues([])
    try {
      const result = await validate(csv)
      if (request !== revision.current) return
      setIssues(result.issues)
      setBatch(result.issues.length ? undefined : result.batch)
    } catch {
      if (request === revision.current)
        setIssues([{ message: 'Unable to validate payments. Check your network connection and try again.' }])
    } finally {
      if (request === revision.current) setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Send native tokens and ERC20s in one Safe transaction. Upload or paste up to {MAX_PAYMENTS} payments. Available
        gas may limit the batch size.
      </p>
      <Field>
        <FieldLabel htmlFor="batch-csv-file">Upload CSV</FieldLabel>
        <Input
          id="batch-csv-file"
          type="file"
          accept=".csv,text/csv"
          disabled={disabled}
          onChange={(event) => {
            void upload(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </Field>
      <a
        className="text-sm underline"
        download="batch-payments-example.csv"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(EXAMPLE)}`}
      >
        Download example CSV
      </a>
      <Field>
        <FieldLabel htmlFor="batch-csv">Payment CSV</FieldLabel>
        <Textarea
          id="batch-csv"
          value={csv}
          onChange={(event) => updateCsv(event.target.value)}
          rows={8}
          disabled={disabled}
          aria-describedby="batch-csv-help"
          className="font-mono"
          placeholder="token_address,receiver,amount"
        />
        <FieldDescription id="batch-csv-help">
          Required columns: token_address, receiver, amount (or value). Leave token_address blank for native tokens. NFT
          imports are not supported.
        </FieldDescription>
      </Field>
      {issues.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <p>Fix all errors before continuing. No payments have been prepared.</p>
            <ul className="max-h-48 list-disc overflow-y-auto pl-4">
              {issues.map((issue, index) => (
                <li key={index}>
                  {issue.row ? `Row ${issue.row}: ` : ''}
                  {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {batch && <BatchPreview key={batch.csv} batch={batch} />}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant={batch ? 'outline' : 'default'}
          disabled={disabled || busy || !csv.trim()}
          onClick={() => void review()}
        >
          {busy ? (
            <>
              <Spinner />
              Validating payments
            </>
          ) : (
            'Validate CSV'
          )}
        </Button>
        {batch && (
          <Button type="button" disabled={disabled || busy} onClick={() => onContinue(batch)}>
            Review transaction
          </Button>
        )}
      </div>
    </div>
  )
}
