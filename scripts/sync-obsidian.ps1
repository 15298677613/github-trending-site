# sync-obsidian.ps1 - 把 GitHub 热门项目报告同步到 Obsidian 资料库
# 用法: powershell -ExecutionPolicy Bypass -File scripts/sync-obsidian.ps1
$ErrorActionPreference = 'Stop'

# 报告来源（多个位置都扫描，取最新的）
$sources = @(
  'C:\Users\Administrator\Documents\codex项目\GitHub热门项目',
  'C:\Users\Administrator\Documents\Github\reports\raw'
)

# Obsidian 目标
$vaultBase = 'D:\Obsidian仓库\GitHub热门项目'
$targets = @{
  '日报' = 'GitHub每日热门日报_*.md'
  '周报' = 'GitHub每周潜力项目汇总_*.md'
  '月报' = 'GitHub每月趋势总结_*.md'
}

$files = @{}
foreach ($src in $sources) {
  if (-not (Test-Path $src)) { continue }
  foreach ($dir in $targets.Keys) {
    Get-ChildItem -LiteralPath $src -Filter $targets[$dir] -File -ErrorAction SilentlyContinue | ForEach-Object {
      if (-not $files.ContainsKey($_.Name) -or $_.LastWriteTime -gt $files[$_.Name].LastWriteTime) {
        $files[$_.Name] = $_
      }
    }
  }
}

Write-Output ("找到报告文件: " + $files.Count)
foreach ($dir in $targets.Keys) {
  $dst = Join-Path $vaultBase $dir
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
}
foreach ($f in $files.Values) {
  $dir = ($targets.GetEnumerator() | Where-Object { $_.Name -eq ($targets.Keys | Where-Object { $targets[$_] -like ('*' + $f.Name.Split('_')[0] + '*') }) } | Select-Object -First 1)
  $dstDir = Join-Path $vaultBase $dir.Name
  Copy-Item -LiteralPath $f.FullName -Destination $dstDir -Force
  Write-Output ("  已复制: " + $f.Name + " -> " + $dstDir)
}

# 生成索引首页
function Get-ReportList($folder, $label) {
  $p = Join-Path $vaultBase $folder
  $notes = Get-ChildItem -LiteralPath $p -Filter *.md -File -ErrorAction SilentlyContinue | Sort-Object Name -Descending
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("## " + $label + "（共 " + $notes.Count + " 份）")
  foreach ($n in $notes) {
    $date = $n.BaseName -replace '^GitHub(每日热门日报|每周潜力项目汇总|每月趋势总结)_', ''
    [void]$sb.AppendLine("- [[" + $n.BaseName + "|" + $date + "]]")
  }
  [void]$sb.AppendLine("")
  return $sb.ToString()
}

$now = Get-Date -Format 'yyyy-MM-dd HH:mm'
$index = @"
---
tags: [github, 热门项目, 情报站, 资料库]
title: GitHub 热门项目资料库
---

# GitHub 热门项目资料库

> 本资料库由 Codex 自动同步维护：每日热门项目日报、每周潜力项目汇总、每月趋势总结。
> 每份报告含项目的内容、作用、适用场景与上手方法，以及可强化 AI 客户端（Claude Code / Codex / Cursor / Cline 等）能力的潜力项目分析。

$(Get-ReportList '日报' '📄 每日日报')
$(Get-ReportList '周报' '📊 每周汇总')
$(Get-ReportList '月报' '📈 月度总结')
---
*最后同步：$now*
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $vaultBase '首页.md'), $index, $utf8NoBom)
Write-Output "索引首页已更新: $vaultBase\首页.md"
