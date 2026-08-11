# publish.ps1 - 构建并发布 GitHub 热门项目情报站
# 用法: powershell -ExecutionPolicy Bypass -File scripts/publish.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Output "[1/3] 构建网站..."
node scripts/build.js
if ($LASTEXITCODE -ne 0) { throw "构建失败：node scripts/build.js 返回 $LASTEXITCODE" }

Write-Output "[2/3] 提交变更..."
$publishPaths = @('index.html', 'version.json', 'reports')
$changed = @(git status --porcelain -- $publishPaths)
if ($changed.Count -gt 0) {
  git add -A -- $publishPaths
  if ($LASTEXITCODE -ne 0) { throw "git add 失败：$LASTEXITCODE" }
  git commit --only -m "自动更新报告 $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -- $publishPaths
  if ($LASTEXITCODE -ne 0) { throw "git commit 失败：$LASTEXITCODE（可能权限不足，请用管理员权限运行）" }
  Write-Output "已提交报告发布范围内的变更：$($changed.Count) 项"
} else {
  Write-Output "没有新变更，跳过提交。"
}

Write-Output "[3/3] 推送远程..."
$remote = git remote
if ($remote) {
  git push
  if ($LASTEXITCODE -ne 0) { throw "git push 失败：$LASTEXITCODE（请检查远程仓库与凭证）" }
  Write-Output "已推送到远程仓库。"
} else {
  Write-Output "未配置远程仓库，仅本地更新完成。如需上线请按 README 配置 GitHub Pages。"
}

Write-Output "完成。"
