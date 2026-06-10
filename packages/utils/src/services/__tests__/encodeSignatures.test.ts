import { generatePreValidatedSignature } from '@safe-global/protocol-kit'
import { faker } from '@faker-js/faker'
import { encodeSignatures, willEncodeEnoughSignatures } from '../encodeSignatures'
import { createMockSafeTransaction } from '../../tests/transactions'

const createTx = () =>
  createMockSafeTransaction({
    to: faker.finance.ethereumAddress(),
    data: '0x00',
  })

describe('encodeSignatures', () => {
  it('pads a pre-validated signature for the connected owner when a signature is needed', () => {
    const safeTx = createTx()
    const owner = faker.finance.ethereumAddress().toLowerCase()

    const encoded = encodeSignatures(safeTx, owner, true)

    expect(encoded).toEqual(generatePreValidatedSignature(owner).data)
    // The "fake" signature is removed again
    expect(safeTx.signatures.size).toBe(0)
  })

  it('does not pad when no signature is needed', () => {
    const safeTx = createTx()
    const owner = faker.finance.ethereumAddress()
    safeTx.addSignature(generatePreValidatedSignature(owner))

    const encoded = encodeSignatures(safeTx, owner, false)

    expect(encoded).toEqual(generatePreValidatedSignature(owner).data)
    expect(safeTx.signatures.size).toBe(1)
  })

  it('does not pad when no owner is connected', () => {
    const safeTx = createTx()

    expect(encodeSignatures(safeTx, undefined, true)).toEqual('0x')
  })
})

describe('willEncodeEnoughSignatures', () => {
  const owner = faker.finance.ethereumAddress().toLowerCase()

  it('returns false for an unsigned tx on a threshold-2 Safe even with a connected owner', () => {
    const safeTx = createTx()

    expect(willEncodeEnoughSignatures(safeTx, owner, 2)).toBe(false)
  })

  it('returns true for an unsigned tx on a threshold-1 Safe with a connected owner', () => {
    const safeTx = createTx()

    expect(willEncodeEnoughSignatures(safeTx, owner, 1)).toBe(true)
  })

  it('returns false for an unsigned tx on a threshold-1 Safe without a connected owner', () => {
    const safeTx = createTx()

    expect(willEncodeEnoughSignatures(safeTx, undefined, 1)).toBe(false)
  })

  it('counts the connected owner pad only once when they have already signed', () => {
    const safeTx = createTx()
    safeTx.addSignature(generatePreValidatedSignature(owner))

    expect(willEncodeEnoughSignatures(safeTx, owner, 2)).toBe(false)
    expect(willEncodeEnoughSignatures(safeTx, owner.toUpperCase().replace('0X', '0x'), 2)).toBe(false)
  })

  it('returns true when collected signatures plus the owner pad reach the threshold', () => {
    const safeTx = createTx()
    safeTx.addSignature(generatePreValidatedSignature(faker.finance.ethereumAddress()))

    expect(willEncodeEnoughSignatures(safeTx, owner, 2)).toBe(true)
  })

  it('returns true when collected signatures alone reach the threshold', () => {
    const safeTx = createTx()
    safeTx.addSignature(generatePreValidatedSignature(faker.finance.ethereumAddress()))
    safeTx.addSignature(generatePreValidatedSignature(faker.finance.ethereumAddress()))

    expect(willEncodeEnoughSignatures(safeTx, undefined, 2)).toBe(true)
  })
})
