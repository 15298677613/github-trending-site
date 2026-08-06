# weekly-report.ps1 - 每周潜力项目汇总（周日21:00运行）
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\Administrator\Documents\Github'
$log = "$root\work\report-task.log"
function Log($msg) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"; Add-Content -LiteralPath $log -Value $line -Encoding UTF8; Write-Output $line }
try {
  Log "===== 开始每周汇总任务 ====="
  Set-Location $root
  # 数据量校验：近8天内的日报至少4份才算一周数据齐全
  $recent = @(Get-ChildItem "$root\reports\raw" -Filter "GitHub每日热门日报_*.md" -File | Where-Object { $_.LastWriteTime -ge (Get-Date).AddDays(-8) })
  Log ("本周日报数量: " + $recent.Count)
  if ($recent.Count -lt 4) { Log "数据不足（需至少4份日报），本周暂不生成周报，等待数据积累"; return }

  Log "[1/3] 生成周报（Codex 汇总分析）..."
  Get-Content -LiteralPath "$root\scripts\weekly-report-prompt.txt" -Encoding UTF8 -Raw | codex exec -C $root -s danger-full-access --skip-git-repo-check 2>&1 | Out-Null
  Log "[1/3] 完成"
  Log "[2/3] 同步网站..."
  powershell -ExecutionPolicy Bypass -File "$root\scripts\publish.ps1" | Out-Null
  Log "[2/3] 完成"
  Log "[3/3] 同步 Obsidian..."
  powershell -ExecutionPolicy Bypass -File "$root\scripts\sync-obsidian.ps1" | Out-Null
  Log "[3/3] 完成"
  Log "===== 每周汇总任务结束 ====="
} catch { Log ("任务出错: " + $_.Exception.Message) }
