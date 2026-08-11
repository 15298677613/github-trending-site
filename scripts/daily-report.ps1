# daily-report.ps1 - 每日报告：生成 + 同步网站 + 同步 Obsidian
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Administrator\Documents\Github'
$log = "$root\work\daily-report.log"
. "$root\scripts\report-runtime.ps1"
function Log($msg) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"; Add-Content -LiteralPath $log -Value $line -Encoding UTF8; Write-Output $line }
try {
  Log "===== 开始每日报告任务 ====="
  Set-Location $root
  $today = Get-Date -Format 'yyyy-MM-dd'
  $todayFile = "$root\reports\raw\GitHub每日热门日报_$today.md"
  if (Test-Path $todayFile) {
    Log "今日报告已存在，跳过生成（幂等）"
    powershell -ExecutionPolicy Bypass -File "$root\scripts\sync-obsidian.ps1" | Out-Null
    return
  }
  Log "[1/3] 生成报告（Codex 自动收集并分析，模型: $ReportModel）..."
  $prompt = Get-Content -LiteralPath "$root\scripts\daily-report-prompt.txt" -Encoding UTF8 -Raw
  $codexExitCode = Invoke-ReportCodex -Root $root -Prompt $prompt -OutputPath "$root\work\codex-daily.out"
  if ($codexExitCode -ne 0) { throw "Codex 生成日报失败，退出码: $codexExitCode；详见 $root\work\codex-daily.out" }
  if (-not (Test-Path -LiteralPath $todayFile) -or (Get-Item -LiteralPath $todayFile).Length -eq 0) {
    throw "Codex 返回成功，但未生成有效的今日日报: $todayFile"
  }
  Log "[1/3] 完成并验证日报文件"
  Log "[2/3] 同步网站..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$root\scripts\publish.ps1" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "网站发布失败，退出码: $LASTEXITCODE" }
  Log "[2/3] 完成"
  Log "[3/3] 同步 Obsidian..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$root\scripts\sync-obsidian.ps1" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Obsidian 同步失败，退出码: $LASTEXITCODE" }
  $obsidianFile = "D:\Obsidian仓库\GitHub热门项目\日报\GitHub每日热门日报_$today.md"
  if (-not (Test-Path -LiteralPath $obsidianFile) -or (Get-Item -LiteralPath $obsidianFile).Length -eq 0) {
    throw "同步脚本返回成功，但 Obsidian 中缺少今日日报: $obsidianFile"
  }
  Log "[3/3] 完成"
  Log "===== 每日报告任务结束 ====="
} catch {
  Log ("任务出错: " + $_.Exception.Message)
  exit 1
}
