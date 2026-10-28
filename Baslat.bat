@echo off
cd /d "%~dp0"
echo Lumina baslatiliyor... Tarayici birkac saniye icinde acilacak: http://localhost:3000
echo Kapatmak icin bu pencereyi kapatin.
rem Tarayici, sunucu hazir olduktan sonra acilsin (yoksa eski onbellekteki sayfa gorunur)
where npx >nul 2>nul
if %errorlevel%==0 (
  start "" /b cmd /c "ping -n 6 127.0.0.1 >nul & explorer http://localhost:3000"
  npx --yes serve -l 3000 .
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & explorer http://localhost:3000"
    python -m http.server 3000
  ) else (
    echo Node.js veya Python bulunamadi. Node.js kurun: https://nodejs.org
    pause
  )
)
