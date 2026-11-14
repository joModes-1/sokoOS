@echo off
rem Temporary server-restart helper (deleted after the pass). Restarts the web app on :3000
rem against the freshly built .next, then runs the health check.
cd /d C:\Users\joModes\Downloads\sokoos-complete\sokoos

echo --- stop :3000 --- > .tmp_webstart.txt
for /f "tokens=5" %%p in ('netstat -ano ^| findstr LISTENING ^| findstr ":3000"') do (
  echo killing PID %%p >> .tmp_webstart.txt
  taskkill /PID %%p /F >> .tmp_webstart.txt 2>&1
)
ping -n 4 127.0.0.1 > nul

echo --- start :3000 --- >> .tmp_webstart.txt
start "" /b cmd /c "cd /d C:\Users\joModes\Downloads\sokoos-complete\sokoos\apps\web && pnpm.cmd start > ..\..\.tmp_weblog7.txt 2>&1"
ping -n 15 127.0.0.1 > nul

call .tmp_health.cmd
echo === RESTART DONE === >> .tmp_health.txt
