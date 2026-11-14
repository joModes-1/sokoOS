@echo off
rem Temporary verification helper (deleted after the pass). Writes one report file so the
rem harness can read the result without relying on interactive shell output.
cd /d C:\Users\joModes\Downloads\sokoos-complete\sokoos
set OUT=.tmp_health.txt
echo --- listeners --- > %OUT%
netstat -ano | findstr LISTENING | findstr ":3000 :3001" >> %OUT% 2>&1
echo --- http --- >> %OUT%
powershell -NoProfile -Command "try { $r = Invoke-WebRequest http://localhost:3000/login -UseBasicParsing -TimeoutSec 20; 'HTTP ' + $r.StatusCode + '  /login' } catch { 'FAILED /login: ' + $_.Exception.Message }" >> %OUT% 2>&1
powershell -NoProfile -Command "try { $r = Invoke-WebRequest http://localhost:3000/settings/appearance -UseBasicParsing -TimeoutSec 20; 'HTTP ' + $r.StatusCode + '  /settings/appearance' } catch { 'FAILED /settings/appearance: ' + $_.Exception.Message }" >> %OUT% 2>&1
powershell -NoProfile -Command "try { $r = Invoke-WebRequest http://localhost:3001/v1/health -UseBasicParsing -TimeoutSec 20; 'HTTP ' + $r.StatusCode + '  /v1/health' } catch { 'FAILED /v1/health: ' + $_.Exception.Message }" >> %OUT% 2>&1
echo --- theme tokens served --- >> %OUT%
powershell -NoProfile -Command "try { $c = (Invoke-WebRequest http://localhost:3000/login -UseBasicParsing -TimeoutSec 20).Content; if ($c -match 'sokoos\.brand') { 'bootstrap script present in HTML' } else { 'bootstrap script MISSING from HTML' } } catch { 'FAILED: ' + $_.Exception.Message }" >> %OUT% 2>&1
powershell -NoProfile -Command "try { $r = Invoke-WebRequest http://localhost:3000/_next/static/css -UseBasicParsing -TimeoutSec 5 } catch { } ; $html = (Invoke-WebRequest http://localhost:3000/login -UseBasicParsing -TimeoutSec 20).Content; $m = [regex]::Matches($html, '/_next/static/css/[^\"'']+\.css'); if ($m.Count -gt 0) { $css = (Invoke-WebRequest ('http://localhost:3000' + $m[0].Value) -UseBasicParsing -TimeoutSec 20).Content; if ($css -match '--brand-rgb') { 'accent channel vars in built CSS' } else { 'accent channel vars MISSING from built CSS' }; if ($css -match 'data-brand=.ocean') { 'ocean preset in built CSS' } else { 'ocean preset MISSING from built CSS' } } else { 'no css link found in HTML' }" >> %OUT% 2>&1
echo --- weblog --- >> %OUT%
if exist .tmp_weblog7.txt (powershell -NoProfile -Command "Get-Content .tmp_weblog7.txt -Tail 12" >> %OUT% 2>&1) else (echo no .tmp_weblog7.txt >> %OUT%)
echo --- DONE --- >> %OUT%
