import type { SafeTransaction } from '@safe-global/types-kit'
import { generatePreValidatedSignature } from '@safe-global/protocol-kit'

const getPaddedOwner = (
  safeTx: SafeTransaction,
  from: string | undefined,
  needsSignature: boolean,
): string | undefined => {
  const owner = from?.toLowerCase()
  return needsSignature && owner !== undefined && !safeTx.signatures.has(owner) ? owner : undefined
}

export const encodeSignatures = (
  safeTx: SafeTransaction,
  from: string | undefined,
  needsSignature: boolean,
): string => {
  const paddedOwner = getPaddedOwner(safeTx, from, needsSignature)

  // https://docs.gnosis.io/safe/docs/contracts_signatures/#pre-validated-signatures
  if (paddedOwner) {
    safeTx.addSignature(generatePreValidatedSignature(paddedOwner))
  }

  const encoded = safeTx.encodedSignatures()

  // Remove the "fake" signature we've just added
  if (paddedOwner) {
    safeTx.signatures.delete(paddedOwner)
  }

  return encoded
}

/**
 * Whether `encodeSignatures` will produce a blob that satisfies the Safe's threshold.
 * `execTransaction` reverts with GS020 ("Signatures data too short") below
 * `threshold * 65` bytes, so gas estimation is doomed while this returns false.
 */
export const willEncodeEnoughSignatures = (
  safeTx: SafeTransaction,
  from: string | undefined,
  threshold: number,
): boolean => {
  const needsSignature = safeTx.signatures.size < threshold
  const padCount = getPaddedOwner(safeTx, from, needsSignature) ? 1 : 0
  return safeTx.signatures.size + padCount >= threshold
}
