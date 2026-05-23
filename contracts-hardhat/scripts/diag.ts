
const { ethers } = require('hardhat');
async function main() {
  const market = '0xb084Afb8925BBF6A98717a10219d150Bcf0B5c1f';
  const user   = '0xD208aC8327e6479967693Af2F2216e1612D0171A';
  const provider = ethers.provider;
  const abi = [
    'function maxBorrowable(address) view returns (uint128)',
    'function totalSupplyAssets() view returns (uint128)',
    'function totalBorrowAssets() view returns (uint128)',
    'function lltvBps() view returns (uint64)',
    'function loanAsset() view returns (address)',
    'function collateralAsset() view returns (address)',
  ];
  const m = new ethers.Contract(market, abi, provider);
  console.log('lltv', await m.lltvBps());
  console.log('loanAsset', await m.loanAsset());
  console.log('collateralAsset', await m.collateralAsset());
  console.log('totalSupply', await m.totalSupplyAssets());
  console.log('totalBorrow', await m.totalBorrowAssets());
  console.log('maxBorrowable(user)', await m.maxBorrowable(user));

  // bytecode size sanity
  const code = await provider.getCode(market);
  console.log('codeSize', (code.length-2)/2);
}
main().catch(e=>{ console.error(e); process.exit(1); });

