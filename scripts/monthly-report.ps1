# monthly-report.ps1 - 每月趋势总结（每月1日21:00运行）
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Administrator\Documents\Github'
$log = "$root\work\report-task.log"
. "$root\scripts\report-runtime.ps1"
function Log($msg) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"; Add-Content -LiteralPath $log -Value $line -Encoding UTF8; Write-Output $line }
try {
  Log "===== 开始月度总结任务 ====="
  Set-Location $root
  # 数据量校验：近35天内的日报至少15份，才算有一个月左右的数据
  $recent = @(Get-ChildItem "$root\reports\raw" -Filter "GitHub每日热门日报_*.md" -File | Where-Object { $_.LastWriteTime -ge (Get-Date).AddDays(-35) })
  Log ("近一个月日报数量: " + $recent.Count)
  if ($recent.Count -lt 15) { Log "数据不足（需至少15份日报），本月暂不生成月报，等待数据积累"; return }

  $reportMonth = (Get-Date).AddMonths(-1).ToString('yyyy-MM')
  $monthlyFile = "$root\reports\raw\GitHub每月趋势总结_$reportMonth.md"
  Log "[1/3] 生成月报（Codex 汇总分析，模型: $ReportModel）..."
  $prompt = Get-Content -LiteralPath "$root\scripts\monthly-report-prompt.txt" -Encoding UTF8 -Raw
  $codexExitCode = Invoke-ReportCodex -Root $root -Prompt $prompt -OutputPath "$root\work\codex-monthly.out"
  if ($codexExitCode -ne 0) { throw "Codex 生成月报失败，退出码: $codexExitCode；详见 $root\work\codex-monthly.out" }
  if (-not (Test-Path -LiteralPath $monthlyFile) -or (Get-Item -LiteralPath $monthlyFile).Length -eq 0) {
    throw "Codex 返回成功，但未生成有效的月报: $monthlyFile"
  }
  Log "[1/3] 完成并验证月报文件"
  Log "[2/3] 同步网站..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$root\scripts\publish.ps1" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "网站发布失败，退出码: $LASTEXITCODE" }
  Log "[2/3] 完成"
  Log "[3/3] 同步 Obsidian..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$root\scripts\sync-obsidian.ps1" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Obsidian 同步失败，退出码: $LASTEXITCODE" }
  $obsidianFile = "D:\Obsidian仓库\GitHub热门项目\月报\GitHub每月趋势总结_$reportMonth.md"
  if (-not (Test-Path -LiteralPath $obsidianFile) -or (Get-Item -LiteralPath $obsidianFile).Length -eq 0) {
    throw "同步脚本返回成功，但 Obsidian 中缺少月报: $obsidianFile"
  }
  Log "[3/3] 完成"
  Log "===== 月度总结任务结束 ====="
} catch {
  Log ("任务出错: " + $_.Exception.Message)
  exit 1
}
