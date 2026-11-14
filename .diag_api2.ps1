$ErrorActionPreference = 'Continue'
$root = 'c:\Users\joModes\Downloads\sokoos-complete\sokoos'
$out = Join-Path $root '.diag_api2.txt'

('shell PORT env = [' + $env:PORT + ']') | Set-Content $out
('shell NODE_ENV env = [' + $env:NODE_ENV + ']') | Add-Content $out

'=== listening ports owned by api pid 1244 ===' | Add-Content $out
$c = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq 1244 }
if ($c) { $c | ForEach-Object { ('port ' + $_.LocalPort + ' on ' + $_.LocalAddress) } | Add-Content $out } else { 'none' | Add-Content $out }

'=== all listening ports ===' | Add-Content $out
(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -lt 20000 } | Select-Object -ExpandProperty LocalPort | Sort-Object -Unique) -join ', ' | Add-Content $out

'=== api log tail ===' | Add-Content $out
$al = Join-Path $root 'logs\api.dev.log'
if (Test-Path $al) { (Get-Content $al -Tail 30) | ForEach-Object { $_ -replace "`e\[[0-9;]*[A-Za-z]", '' } | Add-Content $out } else { 'no api log' | Add-Content $out }

'=== direct run of dist/main (10s capture) ===' | Add-Content $out
$t = Join-Path $root '.api_direct.log'
Remove-Item $t -Force -ErrorAction SilentlyContinue
$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "node dist\main > `"$t`" 2>&1" -WorkingDirectory (Join-Path $root 'apps\api') -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 10
$alive = [bool](Get-Process -Id $proc.Id -ErrorAction SilentlyContinue)
('direct-run alive after 10s = ' + $alive) | Add-Content $out
if (Test-Path $t) { (Get-Content $t -Tail 40) | ForEach-Object { $_ -replace "`e\[[0-9;]*[A-Za-z]", '' } | Add-Content $out } else { 'no direct log' | Add-Content $out }
$c2 = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 3001 }
if ($c2) { '3001 now listening (direct run bound it)' | Add-Content $out } else { '3001 still not listening' | Add-Content $out }
Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*sokoos*api*dist*main*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
'=== END ===' | Add-Content $out