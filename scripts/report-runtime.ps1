# Shared Codex runtime for scheduled GitHub reports.
$ReportModel = 'gpt-5.6-sol'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$global:OutputEncoding = $utf8NoBom
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
& "$env:SystemRoot\System32\chcp.com" 65001 | Out-Null

$localCodex = Get-ChildItem -LiteralPath "$env:LOCALAPPDATA\OpenAI\Codex\bin" -Filter 'codex.exe' -File -Recurse -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if ($localCodex) {
  $ReportCodexCli = $localCodex.FullName
} else {
  $ReportCodexCli = (Get-Command 'codex.exe' -ErrorAction Stop).Source
}

function Invoke-ReportCodex {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$Prompt,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $savedErrorActionPreference = $ErrorActionPreference
  try {
    # Windows PowerShell 5.1 wraps ordinary native stderr as error records.
    # The native exit code remains the authoritative success signal.
    $ErrorActionPreference = 'Continue'
    & $ReportCodexCli exec -C $Root -m $ReportModel -s danger-full-access --skip-git-repo-check --ephemeral $Prompt *> $OutputPath
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $savedErrorActionPreference
  }
}
