import { useLazySafeShieldAnalyzeRecipientV1Query } from '@safe-global/store/gateway/AUTO_GENERATED/safe-shield'
import type { RecipientAnalysisResults } from '../types'
import type { AsyncResult } from '@safe-global/utils/hooks/useAsync'
import { useAsyncDeepCompare } from './util-hooks/useAsyncDeepCompare'

/**
 * Wrapper hook for useSafeShieldAnalyzeRecipientV1Query that fetches analysis for multiple recipients
 * @param recipientAddresses - Array of recipient addresses to fetch analysis for
 * @returns Tuple of [results, error, loading] where results is keyed by recipient address
 */
export function useFetchMultiRecipientAnalysis({
  safeAddress,
  chainId,
  recipientAddresses,
}: {
  safeAddress: string
  chainId: string
  recipientAddresses: string[]
}): AsyncResult<RecipientAnalysisResults> {
  const [fetchRecipientAnalysis] = useLazySafeShieldAnalyzeRecipientV1Query()

  return useAsyncDeepCompare<RecipientAnalysisResults | undefined>(async () => {
    if (!safeAddress || recipientAddresses.length === 0) {
      return
    }

    const results: RecipientAnalysisResults = {}
    try {
      for (let offset = 0; offset < recipientAddresses.length; offset += 5) {
        await Promise.all(
          recipientAddresses.slice(offset, offset + 5).map(async (recipientAddress) => {
            const result = await fetchRecipientAnalysis({ chainId, safeAddress, recipientAddress })
            if (result.isError) throw new Error(result.status)
            if (!result.data) throw new Error('No data returned')
            results[recipientAddress] = result.data as RecipientAnalysisResults[string]
          }),
        )
      }
      return results
    } catch (err) {
      throw new Error(`Failed to fetch recipient analysis: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [recipientAddresses, chainId, safeAddress, fetchRecipientAnalysis])
}
