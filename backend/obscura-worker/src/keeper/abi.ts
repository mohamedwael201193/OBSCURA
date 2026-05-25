// Minimal ABIs for the credit keeper
import type { Address } from "viem";

export const MARKET_ABI = [
  { type: "function", name: "loanAsset",         stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "collateralAsset",    stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "liqThresholdBps",    stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "liqBonusBps",        stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "borrowersLength",    stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "borrowerAt",         stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "hasBorrow",          stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getPlainBorrow",     stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint128" }] },
  { type: "function", name: "getPlainCollateral", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint128" }] },
  { type: "function", name: "liquidationOpen",    stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "event", name: "LiquidationOpened",
    inputs: [
      { indexed: true, name: "borrower",   type: "address" },
      { indexed: true, name: "auctionId",  type: "uint256" },
    ],
  },
] as const;

export const AUCTION_ABI = [
  { type: "function", name: "auctionsLength", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "getAuction", stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "market",     type: "address" },
      { name: "borrower",   type: "address" },
      { name: "endsAt",     type: "uint64" },
      { name: "bestBid",    type: "uint64" },
      { name: "bestBidder", type: "address" },
      { name: "settled",    type: "bool" },
      { name: "bids",       type: "uint32" },
    ],
  },
  {
    type: "function", name: "submitBid", stateMutability: "nonpayable",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "bidPlain",  type: "uint64" },
      {
        name: "encBid", type: "tuple", components: [
          { name: "ctHash",       type: "uint256" },
          { name: "securityZone", type: "uint8" },
          { name: "utype",        type: "uint8" },
          { name: "signature",    type: "bytes" },
        ],
      },
    ],
    outputs: [],
  },
  { type: "function", name: "settle", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [] },
  {
    type: "event", name: "AuctionOpened",
    inputs: [
      { indexed: true, name: "auctionId", type: "uint256" },
      { indexed: true, name: "market",    type: "address" },
      { indexed: true, name: "borrower",  type: "address" },
      { indexed: false, name: "endsAt",   type: "uint64" },
    ],
  },
  {
    type: "event", name: "AuctionSettled",
    inputs: [
      { indexed: true, name: "auctionId", type: "uint256" },
      { indexed: true, name: "winner",    type: "address" },
    ],
  },
] as const;

export const CHAINLINK_ADAPTER_ABI = [
  { type: "function", name: "latestAnswer", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "feedDecimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

export type KeeperAddress = Address;
