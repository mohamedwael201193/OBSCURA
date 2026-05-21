# Copilot Instructions — Obscura FHE Repository

## Project Context

Obscura is a privacy-first DeFi protocol built on Fhenix CoFHE (Fully Homomorphic Encryption) on Arbitrum Sepolia.
All financial data — balances, transfers, positions — is encrypted on-chain using euint64 handles.

## FHE Skill Loading

When working on ANY FHE, encryption, or privacy-related code, read the relevant skill first:

| Task | Skill to Read |
|------|--------------|
| Solidity FHE contracts | `.github/skills/fhe-contracts/SKILL.md` |
| Frontend FHE hooks | `.github/skills/fhe-frontend/SKILL.md` |
| Credit market operations | `.github/skills/obscura-credit/SKILL.md` |
| Encrypted DeFi patterns | `.github/skills/encrypted-defi/SKILL.md` |
| Sealed bid auctions | `.github/skills/encrypted-auctions/SKILL.md` |
| Privacy UI components | `.github/skills/privacy-ui/SKILL.md` |
| Payment + stealth | `.github/skills/shielded-payments/SKILL.md` |
| Dashboard display | `.github/skills/private-dashboards/SKILL.md` |
| Complete FHE reference | `.github/skills/fhenix/SKILL.md` |

## Critical Rules — ALWAYS FOLLOW

1. **FHE.allowThis**: After EVERY encrypted state mutation in Solidity, call `FHE.allowThis(newValue)`
2. **No auto-decrypt on mount**: NEVER call `decryptForView` or `getOrCreateSelfPermit` inside `useEffect`
3. **Two-step incoming transfers**: FHERC20 deposits require `approveOperator` THEN encrypted write
4. **FHE.select not if/else**: Never branch on encrypted booleans with if/else in Solidity
5. **waitForTransactionReceipt**: ALWAYS await receipt before setting `FHEStepStatus.READY`
6. **fhe in deps**: ALWAYS include `fhe` in `useCallback` dependency arrays

## FHE Step Status Flow

`IDLE → ENCRYPTING → COMPUTING → SENDING → SETTLING → READY → IDLE (auto 4s)`

Use `useFHEStatus()` hook from `src/hooks/useFHEStatus.ts`.

## Public vs Encrypted Data Split

- **Auto-load (no wallet needed)**: TVL, rates, utilization, config addresses
- **User-triggered only**: Encrypted balances, positions, credit scores, payment history

## Chain

Arbitrum Sepolia, chainId 421614. All contracts deployed there.

## NEVER

- Add KURA or CovertMRV to any file
- Modify `about.md`, `README.md`, or `wave4.md`
- Auto-decrypt on mount (causes MetaMask spam)
- Use plaintext amounts where InEuint64 is required
