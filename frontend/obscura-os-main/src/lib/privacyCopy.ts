/**
 * privacyCopy — Stealth-Finance vocabulary pack.
 *
 * Centralized so we never accidentally leak the word "encrypted" or
 * "decrypt" to end users — those are protocol jargon. Mortals get
 * "hidden" and "reveal" instead.
 */
export const PRIVACY_COPY = {
  reveal:           "Reveal balance",
  revealAmt:        "Reveal amount",
  hidden:           "Hidden on-chain",
  sealing:          "Sealing your position…",
  stealthTransfer:  "Stealth transfer",
  stealthBorrow:    "Stealth borrow",
  sealedBid:        "Sealed bid",
  privacyShield:    "Privacy shield active",
  hideAgain:        "Hide",
  autoHidden:       "Auto-hidden for privacy",

  // FHE step labels (user-friendly)
  steps: {
    encrypt:  "Sealing",
    submit:   "Submitting",
    compute:  "Computing",
    settle:   "Settling",
    done:     "Confirmed",
  },

  // Hints
  fheETA:           "~3s on Arbitrum Sepolia",
  twoStepETA:       "~6–8s — two-step CoFHE flow",
  gasETA:           "~0.0015 ETH minimum",
} as const;

/** Format helper: encrypted handle placeholder block. */
export const HIDDEN_GLYPHS = "▓▓▓▓";
