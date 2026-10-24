@echo off
cd /d "%~dp0"
echo Lumina baslatiliyor... Tarayici acilacak: http://localhost:3000
echo Kapatmak icin bu pencereyi kapatin.
where npx >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:3000
  npx --yes serve -l 3000 .
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    start "" http://localhost:3000
    python -m http.server 3000
  ) else (
    echo Node.js veya Python bulunamadi. Node.js kurun: https://nodejs.org
    pause
  )
)
