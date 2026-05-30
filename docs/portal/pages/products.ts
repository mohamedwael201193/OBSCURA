import type { DocPage } from "../types";

export const payPage: DocPage = {
  slug: "pay",
  title: "Obscura Pay",
  description: "Encrypted ocUSDC payments, streams, escrows, invoices, stealth receiving, and public-mode smart accounts.",
  category: "Products",
  blocks: [
    {
      type: "paragraph",
      text: "Obscura Pay is the payment layer on /pay. Canonical asset: ocUSDC_Pay (0xEd46020Df8abe7BB1E096f27d089F4326D223a53). Supports private EOA mode (FHE) and public ERC-4337 smart-account mode (Circle USDC).",
    },
    {
      type: "heading",
      level: 2,
      text: "Execution modes",
      id: "modes",
    },
    {
      type: "table",
      headers: ["Mode", "Asset", "Privacy rule"],
      rows: [
        ["Private Mode", "ocUSDC_Pay", "Encrypted FHE writes only; smart-account forwarding rejected (InvalidSigner)"],
        ["Public Mode", "Circle USDC", "Passkey smart account + ERC-4337 relay; no encrypted ocUSDC via AA"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Core contracts",
      id: "contracts",
    },
    {
      type: "table",
      headers: ["Contract", "Address", "Role"],
      rows: [
        ["ocUSDC_Pay", "0xEd46020Df8abe7BB1E096f27d089F4326D223a53", "Confidential USDC wrapper (6 decimals)"],
        ["ObscuraPay", "0x91CdD9a481C732bEB09Ce039da23DC11e83547a4", "Wave 1 payroll foundation"],
        ["ObscuraPayStreamV3", "0xE4328F139F03138D63f7fdF90A8Ef240e04653fA", "Handle-based recurring streams"],
        ["ObscuraConfidentialEscrow", "0x293810A2081114CcE0c98A709a0c31aE07c01D75", "Confidential escrow"],
        ["ObscuraInvoice", "0x62a86C8d68fF32ea41Faf349db6EF7EF496620b7", "Encrypted invoices"],
        ["ObscuraStealthRegistry", "0xa36e791a611D36e2C817a7DA0f41547D30D4917d", "ERC-5564 meta-address registry"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "SDK integration",
      id: "sdk",
    },
    {
      type: "code",
      language: "typescript",
      code: `const balanceCt = await sdk.pay.getShieldedBalance(wallet);
const call = await sdk.pay.buildTransfer(to, amount, encryptedInput);
const calldata = sdk.encodeCall(call);`,
    },
    {
      type: "heading",
      level: 2,
      text: "Key lifecycles",
      id: "lifecycles",
    },
    {
      type: "list",
      items: [
        "Shield — Approve USDC → shield(amount) → FHE.allowThis",
        "Unshield — Encrypt → unshield(amtPlain, encAmt, to)",
        "Direct send — Encrypt → confidentialTransfer(to, encAmount)",
        "Stealth send — Derive stealth → transfer → announce() with retry",
        "Stream V3 — createStream → setOperator → tickStream → escrow cycle",
        "Public UserOp — Build → sign → POST /relay → poll /userop-receipt",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Frontend hooks",
      id: "hooks",
    },
    {
      type: "list",
      items: [
        "useOcUSDCBalance — shield/unshield/reveal",
        "useOcUSDCTransfer — direct private send",
        "usePayStreamV3 — V3 stream create/tick",
        "useInvoice — encrypted invoice create/pay",
        "useStealthInbox / useStealthScan — private inbox (explicit unlock)",
        "useActivityFeed — Supabase Realtime + 30s poll",
      ],
    },
  ],
};

export const creditPage: DocPage = {
  slug: "credit",
  title: "Obscura Credit",
  description: "Privacy-first Morpho Blue-shaped money market with encrypted positions and sealed liquidations.",
  category: "Products",
  blocks: [
    {
      type: "paragraph",
      text: "Obscura Credit on /credit is an isolated FHE money market. Per-user supply shares, borrow shares, and collateral are euint64 handles. Public TVL and utilization remain plaintext.",
    },
    {
      type: "heading",
      level: 2,
      text: "Canonical market",
      id: "market",
    },
    {
      type: "table",
      headers: ["Parameter", "Value"],
      rows: [
        ["Market address", "0x1Ec113297c7F9516A6604aa3b18C180559a6f551"],
        ["Loan / collateral asset", "ocUSDC_Pay"],
        ["LLTV", "8600 bps (86%)"],
        ["Liquidation threshold", "9000 bps (90%)"],
        ["Liquidation bonus", "500 bps (5%)"],
      ],
    },
    {
      type: "diagram",
      title: "Credit architecture",
      mermaid: `flowchart TB
  USER[User EOA]
  OCUSDC[ocUSDC_Pay]
  MARKET[CreditMarket]
  ROUTER[CreditRouter]
  SCORE[ScoreV2]
  AUCT[CreditAuction]
  USER --> OCUSDC --> MARKET
  USER --> ROUTER --> MARKET
  MARKET --> SCORE
  MARKET --> AUCT`,
    },
    {
      type: "heading",
      level: 2,
      text: "Two-step CoFHE pattern",
      id: "two-step",
    },
    {
      type: "paragraph",
      text: "CoFHE rate limiter requires a follow-up FHE op on the same handle: (1) cToken.confidentialTransfer(target, encAmt), then (2) target.recordWithEnc(amtPlain, encAmt2). Used for supply, borrow, repay, and collateral.",
    },
    {
      type: "heading",
      level: 2,
      text: "SDK integration",
      id: "sdk",
    },
    {
      type: "code",
      language: "typescript",
      code: `const market = sdk.credit.getMarketAddress();
const supply = await sdk.credit.buildSupplyCollateral(amount, enc);
const borrow = await sdk.credit.buildBorrow(amount, enc);
const repay = await sdk.credit.buildRepay(amount, enc);`,
    },
    {
      type: "heading",
      level: 2,
      text: "Product tabs",
      id: "tabs",
    },
    {
      type: "list",
      items: [
        "Overview — market status, TVL, ActivityFeed",
        "Borrow — BorrowForm on canonical market",
        "Position — EncryptedTiles, health factor, actions (reveal-on-demand)",
        "Earn — supply and vaults",
        "Liquidations — sealed auction cards",
        "Risk — reputation, notifications, activity",
      ],
    },
  ],
};

export const votePage: DocPage = {
  slug: "vote",
  title: "Obscura Vote",
  description: "FHE-encrypted multi-option governance with treasury, rewards, and OpenZeppelin Governor.",
  category: "Products",
  blocks: [
    {
      type: "paragraph",
      text: "Obscura Vote on /vote provides coercion-resistant encrypted ballots (ObscuraVote V5) plus executable OZ Governor proposals. Eligibility requires ObscuraToken lastClaim > 0.",
    },
    {
      type: "heading",
      level: 2,
      text: "Two governance tracks",
      id: "tracks",
    },
    {
      type: "table",
      headers: ["Track", "Contract", "Ballot privacy"],
      rows: [
        ["Private app governance", "ObscuraVote 0xe358…1730", "Encrypted option index"],
        ["Executable OZ governance", "ObscuraGovernor + Timelock", "Plaintext support/weight (Advanced tab)"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Vote stack",
      id: "stack",
    },
    {
      type: "table",
      headers: ["Contract", "Address", "Role"],
      rows: [
        ["ObscuraVote V5", "0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730", "FHE ballots, delegation, finalization"],
        ["ObscuraTreasury", "0x89252ee3f920978EEfDB650760fe56BA1Ede8c08", "ETH vault + FHE-attested spends"],
        ["ObscuraRewards", "0x435ea117404553A6868fbe728A7A284FCEd15BC2", "0.001 ETH per vote accrual"],
        ["ObscuraGovernor", "0xE4807C9F90a0da8F5B5bafa4361B15ff855b7186", "Executable governance"],
        ["ObscuraTimelock", "0x07b7961627f433a1d9001F82Ac4af9F19b9a9E05", "2-day min delay"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "SDK integration",
      id: "sdk",
    },
    {
      type: "code",
      language: "typescript",
      code: `const count = await sdk.vote.getProposalCount();
const proposal = await sdk.vote.getProposal(1n);
const voteCall = await sdk.vote.buildCastVote(proposalId, optionIndex, enc);
const delegateCall = sdk.vote.buildDelegate(delegatee);`,
    },
    {
      type: "callout",
      variant: "success",
      title: "Production status",
      text: "Private vote, treasury, rewards, and Governor propose/vote/queue/execute lifecycles are E2E validated on Sepolia. Worker indexes four contracts with sanitized args.",
    },
  ],
};
