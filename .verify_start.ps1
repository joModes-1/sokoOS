$ErrorActionPreference = 'Continue'
$root = 'c:\Users\joModes\Downloads\sokoos-complete\sokoos'
$out = Join-Path $root '.verify_report.txt'
Start-Sleep -Seconds 2

'=== listeners ===' | Set-Content $out
$l = (netstat -ano | Select-String 'LISTENING' | Select-String ':(3000|3001)\s')
if ($l) { $l | ForEach-Object { $_.Line } | Add-Content $out } else { 'NONE listening yet' | Add-Content $out }

'=== API health ===' | Add-Content $out
try { (Invoke-WebRequest -UseBasicParsing 'http://localhost:3001/v1/health' -TimeoutSec 10).Content | Add-Content $out }
catch { ('ERR: ' + $_.Exception.Message) | Add-Content $out }

'=== WEB /login ===' | Add-Content $out
try { $r = Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/login' -TimeoutSec 60; ('status=' + $r.StatusCode + ' len=' + $r.Content.Length) | Add-Content $out }
catch { ('ERR: ' + $_.Exception.Message) | Add-Content $out }

'=== api log (tail) ===' | Add-Content $out
$al = Join-Path $root 'logs\api.dev.log'
if (Test-Path $al) { (Get-Content $al -Tail 20) | Add-Content $out } else { 'no api log' | Add-Content $out }

'=== web log (tail) ===' | Add-Content $out
$wl = Join-Path $root 'logs\web.dev.log'
if (Test-Path $wl) { (Get-Content $wl -Tail 20) | Add-Content $out } else { 'no web log' | Add-Content $out }

'=== END ===' | Add-Content $out