import { useState } from 'react'
import { formatUnits, ZeroAddress } from 'ethers'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { BatchPaymentsData } from '../types'

const PAGE_SIZE = 20

export function BatchPreview({ batch }: { batch: BatchPaymentsData }) {
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(batch.recipients.length / PAGE_SIZE)
  const currentPage = Math.min(page, pageCount - 1)
  const recipientCount = new Set(batch.recipients.map((payment) => payment.recipient)).size
  return (
    <div className="flex flex-col gap-4">
      <dl className="rounded-md border border-border p-3 text-sm">
        <dt className="text-muted-foreground">Funding Safe</dt>
        <dd className="break-all font-medium">{batch.safeAddress}</dd>
        <dt className="mt-2 text-muted-foreground">Network</dt>
        <dd className="font-medium">
          {batch.chainName || 'Chain'} (chain ID {batch.chainId})
        </dd>
      </dl>
      <h3 className="font-semibold">
        {batch.recipients.length} {batch.recipients.length === 1 ? 'payment' : 'payments'} to {recipientCount}{' '}
        {recipientCount === 1 ? 'recipient' : 'recipients'}
      </h3>
      <dl className="flex flex-col gap-2" aria-label="Totals by token">
        {batch.totals.map((total) => (
          <div key={total.tokenAddress} className="flex flex-col gap-1">
            <dt className="break-all text-sm text-muted-foreground">
              {total.tokenAddress === ZeroAddress ? 'Native token' : total.tokenAddress}
            </dt>
            <dd className="break-all font-medium">
              {formatUnits(total.units, total.decimals)} {total.symbol}
            </dd>
          </div>
        ))}
      </dl>
      {batch.duplicateRows.length > 0 && (
        <Alert variant="warning">
          <AlertDescription>
            Repeated payments on rows {batch.duplicateRows.join(', ')}. All rows will be sent; check that these payments
            are intentional.
          </AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Row</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batch.recipients.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((payment) => (
            <TableRow key={payment.row}>
              <TableCell>{payment.row}</TableCell>
              <TableCell className="whitespace-normal break-all">
                <div>{payment.recipient}</div>
                {payment.recipientInput !== payment.recipient && (
                  <div className="text-muted-foreground">{payment.recipientInput}</div>
                )}
              </TableCell>
              <TableCell className="whitespace-normal break-all">
                <div>
                  {payment.amount} {payment.symbol}
                </div>
                <div className="text-xs text-muted-foreground">
                  {payment.tokenAddress === ZeroAddress ? 'Native token' : payment.tokenAddress}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageCount > 1 && (
        <nav className="flex items-center justify-between gap-2" aria-label="Payment pages">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage + 1 === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Next page
          </Button>
        </nav>
      )}
    </div>
  )
}
