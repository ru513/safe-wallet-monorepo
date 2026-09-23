# Native batch payments

Web-only CSV import for native tokens and ERC20s. Enable `BATCH_PAYMENTS` in the chain configuration (or the existing development feature-flag editor) to expose **Send → Import CSV**. The flag is off unless configured; this change does not enable any production chain.

## Existing Wallet architecture

The feature uses the existing feature loader, transaction modal and discard confirmation, `TxFlow`, `SafeTxProvider`, `ReviewTransactionV2`, Safe Shield recipient analysis, permissions, nonce handling, proposal/signing/execution, and transaction history. `recipients` follows the existing flow-data convention for mass-payout analytics. The on-chain metadata helper and generated ERC20 factory are shared with Wallet. Transfer encoding and MultiSendCallOnly construction reuse Wallet services.

Feature-local code handles CSV input, exact amount validation, metadata/balance resolution, and paginated previews. No new store slice, persisted state, backend endpoint, smart contract, or dependency is introduced. The optional provider argument on `getERC20TokenInfoOnChain` pins metadata reads to the import's network; existing callers keep using the current global provider.

## CSV format

```csv
token_address,receiver,amount
,0x1234567890123456789012345678901234567890,0.01
0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,0x1234567890123456789012345678901234567890,10.25
```

The second row is native currency; the third is an example using Ethereum USDC. Verify the network, addresses and amounts before sending.

- `value` is accepted as an alias for `amount`.
- Optional `token_type` accepts `native` and `erc20`. Unsupported types/headers are rejected.
- Matching chain prefixes and recipient names resolvable by the current network's provider are supported when domain lookup is enabled.
- Amounts remain strings until exact integer conversion. Excess decimals, zero/negative amounts and uint256 overflow are rejected.
- Every nonblank row must validate. Errors block the entire batch; no partial submission or rounding.
- Repeated payments are retained with a warning. Review shows exact per-token totals, token addresses, resolved recipients, and 20 payments per page.
- Limits: 500 payments and 1 MB. These are input limits, not guarantees that a batch fits a chain's gas or simulation limits. Oversized execution must be handled through the existing review checks; automatic splitting is not implemented.
- Balances are checked in aggregate on-chain during import and again before transaction construction. Metadata is resolved even for tokens missing from indexed/trusted balances.
- Switching Safe/network unmounts the entire transaction flow. Editing input invalidates its preview; stale asynchronous results are ignored. Names are pinned to the reviewed addresses for transaction construction.

## Scope and migration

The CSV interface is compatible with the common fungible-token format from [safe-airdrop](https://github.com/bh2smith/safe-airdrop). This implementation uses Wallet's current React and UI stack. NFT imports, saved bookmarks, drain-Safe generation and donations are outside this release. The original hosted application stays available; when the new flag is disabled, the existing send-form link remains.

No original app source was copied verbatim into this feature. Preserve upstream's MIT notice if incorporating substantial source from it later.

## Verification and review

Run `yarn verify:changed:web` and `yarn verify:web` using Node 22.12 or newer. The new flag is in `packages/utils`; also run that package's type, lint, and chain utility tests. Stories live under **Features / Batch payments** for import, errors, preview, pagination and flow entry.

The new tests cover parsing, precision, all-or-nothing imports, aggregate overspending, duplicates, bounded token lookups, RPC failures, missing indexed token metadata, permission/feature gates, input races, Safe/network changes, replacement nonces and preservation of the prepared transaction for signing. Existing Send and metadata-helper consumers are regression surfaces.

Before production rollout, exercise a real test Safe through proposal, multiple-owner signing and execution, including representative large batches on each supported chain. Real-wallet signing and production-chain gas limits are not verified by the unit/component suite. Test both themes and narrow screens using the stories. No production configuration is changed by this branch.
