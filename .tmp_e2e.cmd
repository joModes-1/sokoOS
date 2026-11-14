@echo off
rem Temporary E2E runner (deleted after the pass): runs the Playwright suite and writes its
rem output to a log the harness can read.
cd /d C:\Users\joModes\Downloads\sokoos-complete\sokoos
cmd /c "pnpm.cmd --filter e2e test > .tmp_e2e.txt 2>&1"
echo ===E2E DONE=== >> .tmp_e2e.txt
