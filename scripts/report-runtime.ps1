# Shared Codex runtime for scheduled GitHub reports.
$ReportModel = 'gpt-5.6-sol'
$ReportEndpoint = 'https://chatgpt.com/'
$ReportCodexAttemptTimeoutMinutes = 20
$ReportCodexMaxAttempts = 3
$ReportCodexRetryDelaySeconds = 120

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

function Write-ReportTrace {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Message
  )

  $parent = Split-Path -Parent $Path
  if ($parent) { [System.IO.Directory]::CreateDirectory($parent) | Out-Null }
  [System.IO.File]::AppendAllText($Path, "$Message`r`n", $utf8NoBom)
}

function Test-ReportNetwork {
  param([int]$TimeoutSeconds = 10)

  try {
    $addresses = [System.Net.Dns]::GetHostAddresses(([System.Uri]$ReportEndpoint).Host)
    if (-not $addresses -or $addresses.Count -eq 0) { return $false }

    $request = [System.Net.HttpWebRequest]::Create($ReportEndpoint)
    $request.Method = 'HEAD'
    $request.Timeout = $TimeoutSeconds * 1000
    $request.ReadWriteTimeout = $TimeoutSeconds * 1000
    $request.Proxy = [System.Net.WebRequest]::GetSystemWebProxy()
    if ($request.Proxy) {
      $request.Proxy.Credentials = [System.Net.CredentialCache]::DefaultNetworkCredentials
    }
    $response = $request.GetResponse()
    $response.Close()
    return $true
  } catch [System.Net.WebException] {
    # Any HTTP response proves that DNS, proxy routing and TLS are working.
    if ($_.Exception.Response) {
      $_.Exception.Response.Close()
      return $true
    }
    return $false
  } catch {
    return $false
  }
}

function Wait-ReportNetwork {
  param(
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [int]$MaxAttempts = 10,
    [int]$DelaySeconds = 60
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    if (Test-ReportNetwork) {
      Write-ReportTrace -Path $OutputPath -Message "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 网络预检通过（第 $attempt 次）"
      return $true
    }
    Write-ReportTrace -Path $OutputPath -Message "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 网络预检失败（第 $attempt/$MaxAttempts 次），等待 $DelaySeconds 秒"
    if ($attempt -lt $MaxAttempts) { Start-Sleep -Seconds $DelaySeconds }
  }
  return $false
}

function Invoke-ReportCodex {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$Prompt,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $outputParent = Split-Path -Parent $OutputPath
  if ($outputParent) { [System.IO.Directory]::CreateDirectory($outputParent) | Out-Null }
  [System.IO.File]::WriteAllText($OutputPath, '', $utf8NoBom)

  if (-not (Wait-ReportNetwork -OutputPath $OutputPath)) {
    Write-ReportTrace -Path $OutputPath -Message '网络在 10 分钟等待期内始终不可用，终止本轮并交由计划任务稍后重试。'
    return 69
  }

  for ($attempt = 1; $attempt -le $ReportCodexMaxAttempts; $attempt++) {
    if ($attempt -gt 1) {
      if (-not (Wait-ReportNetwork -OutputPath $OutputPath -MaxAttempts 5)) {
        Write-ReportTrace -Path $OutputPath -Message "第 $attempt 次运行前网络仍不可用。"
        return 69
      }
    }

    $token = "$PID-$attempt"
    $promptPath = "$OutputPath.$token.prompt.tmp"
    $stdoutPath = "$OutputPath.$token.stdout.tmp"
    $runnerPath = "$OutputPath.$token.runner.tmp.ps1"
    $runnerErrorPath = "$OutputPath.$token.runner.stderr.tmp"
    $exitPath = "$OutputPath.$token.exit.tmp"
    [System.IO.File]::WriteAllText($promptPath, $Prompt, $utf8NoBom)
    Write-ReportTrace -Path $OutputPath -Message "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 开始 Codex 第 $attempt/$ReportCodexMaxAttempts 次运行；单次上限 $ReportCodexAttemptTimeoutMinutes 分钟"

    $exitCode = 1
    $attemptText = ''
    try {
      $codexLiteral = $ReportCodexCli.Replace("'", "''")
      $rootLiteral = $Root.Replace("'", "''")
      $modelLiteral = $ReportModel.Replace("'", "''")
      $promptLiteral = $promptPath.Replace("'", "''")
      $stdoutLiteral = $stdoutPath.Replace("'", "''")
      $exitLiteral = $exitPath.Replace("'", "''")
      $runner = @"
`$ErrorActionPreference = 'Continue'
`$utf8 = New-Object System.Text.UTF8Encoding(`$false)
[Console]::InputEncoding = `$utf8
[Console]::OutputEncoding = `$utf8
`$global:OutputEncoding = `$utf8
`$prompt = Get-Content -LiteralPath '$promptLiteral' -Encoding UTF8 -Raw
& '$codexLiteral' exec -C '$rootLiteral' -m '$modelLiteral' -s danger-full-access --skip-git-repo-check --ephemeral `$prompt 2>&1 |
  Out-File -LiteralPath '$stdoutLiteral' -Encoding UTF8 -Width 100000
`$code = `$LASTEXITCODE
if (`$null -eq `$code) { `$code = 1 }
[System.IO.File]::WriteAllText('$exitLiteral', [string]`$code, `$utf8)
exit `$code
"@
      [System.IO.File]::WriteAllText($runnerPath, $runner, (New-Object System.Text.UTF8Encoding($true)))

      $process = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', $runnerPath
      ) -RedirectStandardError $runnerErrorPath -WindowStyle Hidden -PassThru
      $finished = $process.WaitForExit($ReportCodexAttemptTimeoutMinutes * 60 * 1000)
      if ($finished) {
        $process.WaitForExit()
      } else {
        & "$env:SystemRoot\System32\taskkill.exe" /PID $process.Id /T /F 2>&1 | Out-Null
        $process.WaitForExit()
        $exitCode = 124
        Write-ReportTrace -Path $OutputPath -Message "Codex 第 $attempt 次运行超过 $ReportCodexAttemptTimeoutMinutes 分钟，已终止。"
      }

      $process.Dispose()
      $process = $null

      if ($finished -and (Test-Path -LiteralPath $exitPath)) {
        $exitText = [System.IO.File]::ReadAllText($exitPath, $utf8NoBom).Trim()
        $parsedExitCode = 1
        if ([int]::TryParse($exitText, [ref]$parsedExitCode)) { $exitCode = $parsedExitCode }
      }

      if (Test-Path -LiteralPath $stdoutPath) {
        $content = [System.IO.File]::ReadAllText($stdoutPath, $utf8NoBom)
        if ($content) {
          $attemptText = $content
          [System.IO.File]::AppendAllText($OutputPath, $content, $utf8NoBom)
          if (-not $content.EndsWith("`n")) { [System.IO.File]::AppendAllText($OutputPath, "`r`n", $utf8NoBom) }
        }
      }
      if (Test-Path -LiteralPath $runnerErrorPath) {
        $runnerError = [System.IO.File]::ReadAllText($runnerErrorPath, $utf8NoBom)
        if ($runnerError) {
          $attemptText += $runnerError
          [System.IO.File]::AppendAllText($OutputPath, $runnerError, $utf8NoBom)
          if (-not $runnerError.EndsWith("`n")) { [System.IO.File]::AppendAllText($OutputPath, "`r`n", $utf8NoBom) }
        }
      }
      Write-ReportTrace -Path $OutputPath -Message "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Codex 第 $attempt 次运行退出码: $exitCode"
    } finally {
      Remove-Item -LiteralPath $promptPath, $stdoutPath, $runnerPath, $runnerErrorPath, $exitPath -Force -ErrorAction SilentlyContinue
    }

    if ($exitCode -eq 0) { return 0 }

    $isTransient = $exitCode -eq 124 -or $attemptText -match '(?i)不知道这样的主机|os error 11001|request timed out|failed to connect|reconnecting|network error|connection (?:reset|closed)|transport error|dns'
    if (-not $isTransient -or $attempt -eq $ReportCodexMaxAttempts) { return $exitCode }

    Write-ReportTrace -Path $OutputPath -Message "检测到临时网络故障，$ReportCodexRetryDelaySeconds 秒后重试。"
    Start-Sleep -Seconds $ReportCodexRetryDelaySeconds
  }

  return 1
}
