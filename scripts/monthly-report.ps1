# monthly-report.ps1 - 每月趋势总结（每月1日21:00运行）
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\Administrator\Documents\Github'
$log = "$root\work\report-task.log"
function Log($msg) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"; Add-Content -LiteralPath $log -Value $line -Encoding UTF8; Write-Output $line }
try {
  Log "===== 开始月度总结任务 ====="
  Set-Location $root
  # 数据量校验：近35天内的日报至少15份，才算有一个月左右的数据
  $recent = @(Get-ChildItem "$root\reports\raw" -Filter "GitHub每日热门日报_*.md" -File | Where-Object { $_.LastWriteTime -ge (Get-Date).AddDays(-35) })
  Log ("近一个月日报数量: " + $recent.Count)
  if ($recent.Count -lt 15) { Log "数据不足（需至少15份日报），本月暂不生成月报，等待数据积累"; return }

  Log "[1/3] 生成月报（Codex 汇总分析）..."
  Get-Content -LiteralPath "$root\scripts\monthly-report-prompt.txt" -Encoding UTF8 -Raw | codex exec -C $root -s danger-full-access --skip-git-repo-check 2>&1 | Out-Null
  Log "[1/3] 完成"
  Log "[2/3] 同步网站..."
  powershell -ExecutionPolicy Bypass -File "$root\scripts\publish.ps1" | Out-Null
  Log "[2/3] 完成"
  Log "[3/3] 同步 Obsidian..."
  powershell -ExecutionPolicy Bypass -File "$root\scripts\sync-obsidian.ps1" | Out-Null
  Log "[3/3] 完成"
  Log "===== 月度总结任务结束 ====="
} catch { Log ("任务出错: " + $_.Exception.Message) }
