# 每月趋势总结 - 报告生成 + 同步网站 + 同步 Obsidian
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\Administrator\Documents\Github'
$log = "$root\work\report-task.log"
function Log($msg) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"; Add-Content -LiteralPath $log -Value $line -Encoding UTF8; Write-Output $line }
try {
  Log "===== 开始 每月趋势总结 ====="
  Set-Location $root
  Log "[1/3] 生成报告（Codex 自动收集并分析）..."
  Get-Content -LiteralPath "C:\Users\Administrator\Documents\Github\scripts\monthly-report-prompt.txt" -Encoding UTF8 -Raw | codex exec -C $root -s danger-full-access --skip-git-repo-check 2>&1 | Out-Null
  Log "[1/3] 完成"
  Log "[2/3] 同步网站..."
  powershell -ExecutionPolicy Bypass -File "$root\scripts\publish.ps1" | Out-Null
  Log "[2/3] 完成"
  Log "[3/3] 同步 Obsidian..."
  powershell -ExecutionPolicy Bypass -File "$root\scripts\sync-obsidian.ps1" | Out-Null
  Log "[3/3] 完成"
  Log "===== 每月趋势总结 结束 ====="
} catch {
  Log ("任务出错: " + $_.Exception.Message)
}
