$ErrorActionPreference = 'Continue'
$root = 'c:\Users\joModes\Downloads\sokoos-complete\sokoos'
$out = Join-Path $root '.diag_api.txt'

'=== listeners 3000/3001 ===' | Set-Content $out
$l = (netstat -ano | Select-String 'LISTENING' | Select-String ':(3000|3001)\s')
if ($l) { $l | ForEach-Object { $_.Line } | Add-Content $out } else { 'NONE' | Add-Content $out }

'=== node processes ===' | Add-Content $out
(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object { 'pid=' + $_.ProcessId + ' :: ' + $_.CommandLine }) | Add-Content $out

'=== api log full ===' | Add-Content $out
$al = Join-Path $root 'logs\api.dev.log'
if (Test-Path $al) { (Get-Content $al) | ForEach-Object { $_ -replace "`e\[[0-9;]*[A-Za-z]", '' } | Add-Content $out } else { 'no api log' | Add-Content $out }

'=== END ===' | Add-Content $out