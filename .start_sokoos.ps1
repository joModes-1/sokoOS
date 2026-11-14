# -StopOnly reaps the running stack and exits without starting anything. Needed when a
# process holds a file under node_modules (e.g. Prisma's query-engine DLL, which `prisma
# generate` must replace) and releasing it must happen before the starts.
param([switch]$StopOnly)
$ErrorActionPreference = 'Continue'
$root = 'c:\Users\joModes\Downloads\sokoos-complete\sokoos'
$logs = Join-Path $root 'logs'
if (-not (Test-Path $logs)) { New-Item -ItemType Directory -Path $logs | Out-Null }
$out = Join-Path $root '.start_report.txt'
$me = $PID

'=== listeners before ===' | Set-Content $out
(netstat -ano | Select-String 'LISTENING' | Select-String ':(3000|3001)\s') | ForEach-Object { $_.Line } | Add-Content $out

# Reap by command line, not just by port owner. Killing only the processes holding :3000/:3001 used
# to leave the `nest start --watch` and `next dev` wrappers alive; each surviving watcher then
# restarted its own child on the next file change and raced the others for the port. The losers died
# with EADDRINUSE, and during the restart window nothing was listening at all — which the browser
# reports as "Failed to fetch" on the register form. Reaping the whole tree keeps it to one of each.
'=== reaping previous SokoOS processes ===' | Add-Content $out
$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cmd.exe'" |
  Where-Object { $_.CommandLine -match [regex]::Escape($root) -and $_.ProcessId -ne $me }
foreach ($p in ($procs | Sort-Object ProcessId -Descending)) {
  ("reaping pid " + $p.ProcessId + " (" + $p.Name + ")") | Add-Content $out
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 4

'=== listeners after reap ===' | Add-Content $out
$left = (netstat -ano | Select-String 'LISTENING' | Select-String ':(3000|3001)\s')
if ($left) { $left | ForEach-Object { $_.Line } | Add-Content $out } else { 'none (both free)' | Add-Content $out }

if ($StopOnly) {
  '=== stopped (StopOnly) ===' | Add-Content $out
  exit 0
}

# Stable log names are safe now that the wrappers holding them open are reaped above.
$apiLog = Join-Path $logs 'api.log'
$webLog = Join-Path $logs 'web.log'
Remove-Item $apiLog, $webLog -Force -ErrorAction SilentlyContinue

'=== starting API (apps/api) ===' | Add-Content $out
$api = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "pnpm.cmd dev > `"$apiLog`" 2>&1" -WorkingDirectory (Join-Path $root 'apps\api') -WindowStyle Hidden -PassThru
("api wrapper pid " + $api.Id) | Add-Content $out

'=== starting WEB (apps/web) ===' | Add-Content $out
$web = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "pnpm.cmd dev > `"$webLog`" 2>&1" -WorkingDirectory (Join-Path $root 'apps\web') -WindowStyle Hidden -PassThru
("web wrapper pid " + $web.Id) | Add-Content $out

'=== END ===' | Add-Content $out
