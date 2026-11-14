@echo off
rem Temporary check (deleted after the pass): confirms the built stylesheet carries the accent
rem channel variables and the presets, i.e. the token really is runtime-swappable in production.
cd /d C:\Users\joModes\Downloads\sokoos-complete\sokoos
set OUT=.tmp_csscheck.txt
echo --- css bundles --- > %OUT%
dir /b apps\web\.next\static\css >> %OUT% 2>&1
echo --- files containing --brand-rgb --- >> %OUT%
findstr /m /c:"--brand-rgb" apps\web\.next\static\css\*.css >> %OUT% 2>&1
echo --- files containing the ocean preset --- >> %OUT%
findstr /m /c:"data-brand='ocean'" apps\web\.next\static\css\*.css >> %OUT% 2>&1
echo --- files containing data-brand=ocean (any quoting) --- >> %OUT%
findstr /m /c:"data-brand" apps\web\.next\static\css\*.css >> %OUT% 2>&1
echo --- sunset utility resolves through the variable --- >> %OUT%
findstr /m /c:"var(--brand-rgb)" apps\web\.next\static\css\*.css >> %OUT% 2>&1
echo --- fallback colour kept in the bundle (e.g. sunset light tint) --- >> %OUT%
findstr /m /c:"254 240 232" apps\web\.next\static\css\*.css >> %OUT% 2>&1
echo === CSS CHECK DONE === >> %OUT%
