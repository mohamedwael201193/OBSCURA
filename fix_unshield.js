const fs = require('fs');
let content = fs.readFileSync('d:/route/Obscura/frontend/obscura-os-main/src/hooks/useCUSDCBalance.ts', 'utf8');

const unwrapStart = content.indexOf('  const unwrap = useCallback(');
const returnStart = content.indexOf('  return {', unwrapStart);
console.log('unwrapStart:', unwrapStart, 'returnStart:', returnStart);

const old = content.slice(unwrapStart, returnStart);
console.log('OLD (first 200):', old.slice(0, 200));
