# weekly-report.ps1 - 每周潜力项目汇总（周日21:00运行）
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Administrator\Documents\Github'
$log = "$root\work\report-task.log"
. "$root\scripts\report-runtime.ps1"
function Log($msg) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"; Add-Content -LiteralPath $log -Value $line -Encoding UTF8; Write-Output $line }
try {
  Log "===== 开始每周汇总任务 ====="
  Set-Location $root
  # 数据量校验：近8天内的日报至少4份才算一周数据齐全
  $recent = @(Get-ChildItem "$root\reports\raw" -Filter "GitHub每日热门日报_*.md" -File | Where-Object { $_.LastWriteTime -ge (Get-Date).AddDays(-8) })
  Log ("本周日报数量: " + $recent.Count)
  if ($recent.Count -lt 4) { Log "数据不足（需至少4份日报），本周暂不生成周报，等待数据积累"; return }

  $today = Get-Date -Format 'yyyy-MM-dd'
  $weeklyFile = "$root\reports\raw\GitHub每周潜力项目汇总_$today.md"
  Log "[1/3] 生成周报（Codex 汇总分析，模型: $ReportModel）..."
  $prompt = Get-Content -LiteralPath "$root\scripts\weekly-report-prompt.txt" -Encoding UTF8 -Raw
  $codexExitCode = Invoke-ReportCodex -Root $root -Prompt $prompt -OutputPath "$root\work\codex-weekly.out"
  if ($codexExitCode -ne 0) { throw "Codex 生成周报失败，退出码: $codexExitCode；详见 $root\work\codex-weekly.out" }
  if (-not (Test-Path -LiteralPath $weeklyFile) -or (Get-Item -LiteralPath $weeklyFile).Length -eq 0) {
    throw "Codex 返回成功，但未生成有效的本周周报: $weeklyFile"
  }
  Log "[1/3] 完成并验证周报文件"
  Log "[2/3] 同步网站..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$root\scripts\publish.ps1" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "网站发布失败，退出码: $LASTEXITCODE" }
  Log "[2/3] 完成"
  Log "[3/3] 同步 Obsidian..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$root\scripts\sync-obsidian.ps1" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Obsidian 同步失败，退出码: $LASTEXITCODE" }
  $obsidianFile = "D:\Obsidian仓库\GitHub热门项目\周报\GitHub每周潜力项目汇总_$today.md"
  if (-not (Test-Path -LiteralPath $obsidianFile) -or (Get-Item -LiteralPath $obsidianFile).Length -eq 0) {
    throw "同步脚本返回成功，但 Obsidian 中缺少本周周报: $obsidianFile"
  }
  Log "[3/3] 完成"
  Log "===== 每周汇总任务结束 ====="
} catch {
  Log ("任务出错: " + $_.Exception.Message)
  exit 1
}
