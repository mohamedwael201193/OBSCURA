$base = "D:\route\Obscura\frontend\obscura-os-main\src\components\pay-v4"

function TruncateTo($file, $keepLines) {
  $path = "$base\$file"
  $content = Get-Content $path
  $content[0..($keepLines-1)] | Set-Content $path
  $after = (Select-String -Path $path -Pattern "export default").LineNumber
  Write-Host "$file truncated to $keepLines lines. export default at: $($after -join ', ')"
}

# CrossChainFundForm: old component starts at line 412, keep 410
TruncateTo "CrossChainFundForm.tsx" 410

# Check all files
$files = @("CUSDCPanel.tsx","CUSDCTransferForm.tsx","CrossChainFundForm.tsx","BuyCoverageForm.tsx","CreateStreamFormV2.tsx")
foreach ($f in $files) {
  $path = "$base\$f"
  $lines = (Select-String -Path $path -Pattern "export default").LineNumber
  $total = (Get-Content $path).Count
  Write-Host "$f : total=$total, export-default-lines=$($lines -join ',')"
}
