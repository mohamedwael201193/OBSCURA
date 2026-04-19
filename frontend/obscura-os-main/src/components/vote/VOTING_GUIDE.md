# ObscuraVote — Governance Flow Guide

## What is ObscuraVote?

ObscuraVote is a **privacy-preserving voting system** for governance decisions. Votes are encrypted using FHE (Fully Homomorphic Encryption), so no one — not even the contract — can see how individuals voted. Only aggregate results are revealed after voting ends.

### Key Benefits:

1. **Coercion Resistance** — Voters can change votes before deadline. Coercers can't verify how you actually voted.
2. **Privacy** — Individual votes stay encrypted forever. Only totals are public.
3. **Trustless** — Cryptographic proof; no central authority.
4. **No Voter Suppression** — Nobody knows if you voted or who you voted for.

---

## How to Vote (User Guide)

### Step 1: Prepare (One-time)
1. Go to **PAY app** 
2. Click **"Claim Daily OBS"** to become eligible to vote
3. Return to **VOTE app**

### Step 2: Cast Your Vote
1. Click **CAST VOTE** tab
2. Select a proposal from the dropdown
3. Choose **Yes** or **No**
4. Click **"Cast Vote (Encrypted)"**
5. Sign in MetaMask (no ETH cost, just signing)
6. Vote is encrypted client-side and sent on-chain
7. Your vote is now immutable but invisible to everyone

### Step 3: View Your History
- See which proposals you voted on in **"Your Voting History"**
- Pending = not yet voted
- Voted = you voted on this
- Missed = deadline passed without your vote

---

## How Finalization Works (Admin/Users)

### Step 1: Vote Deadline Passes
Proposals show as "Ended" in the Proposals tab.

### Step 2: Finalize Results (Anyone Can Do This)
1. Go to **RESULTS** tab
2. Find the ended proposal
3. Click **"Finalize Vote"** button
4. Sign in MetaMask
5. On-chain call makes the tally publicly decryptable

### Step 3: View Encrypted Results
1. After finalization, click **"Decrypt Public Tally"**
2. Results appear instantly (no wallet call needed)
3. See Yes/No vote counts and percentages
4. Individual votes remain encrypted forever

---

## Use Cases

### Treasury Allocation
- "Should we allocate 10% to marketing or R&D?"
- Private votes prevent large token holders from controlling public opinion

### Protocol Governance
- "Approve upgrade X to contract?"
- Coercion-resistant voting ensures genuine consensus

### Internal Decisions (DAOs/Orgs)
- Employee raises, promotions, policy changes
- Prevents retaliation; honest feedback

### Community Grants
- "Fund project A or B with treasury?"
- Privacy prevents sybil attacks and whale dominance

---

## Technical Details

### Encryption Flow
1. Your vote (1 or 0) is encrypted using FHE
2. Encrypted vote is sent on-chain
3. Smart contract adds encrypted vote to totals (homomorphic math)
4. After finalization, aggregated totals are made public

### Privacy Guarantee
- Even contract admins cannot see your vote
- Only aggregate tally is decryptable after finalization
- You can revote anytime before deadline without revealing the change

### Revote (Anti-Coercion)
- Change your vote anytime before deadline
- Old vote is subtracted, new vote added
- Coercer cannot verify you actually changed votes
- Provides plausible deniability

---

## Tips

✓ **Claim OBS first** in Pay app before voting
✓ **Revote early** if coerced to vote against your preference
✓ **Check voting history** to track your participation
✓ **Finalize** proposals after deadline so results are viewable
✓ **No gas cost** for voting — only signature needed
