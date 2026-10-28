@echo off
cd /d "%~dp0"
echo ============================================================
echo  LUMINA - TEMIZLIK (tek seferlik)
echo ============================================================
echo  Bu betik yeni klasor yapisina gecisi tamamlar:
echo   - Artik kullanilmayan eski dosyalari siler
echo     (script.js, auth.js, firebase-config.js, style.css koku kopyalari,
echo      futbol_words.js, update_script.*, SQLQuery1/2.sql,
echo      data\oxford3000.csv, Lumina.Api.New, temp_extracted)
echo   - Lumina.Api ve Database klasorlerini server\ altina tasir
echo     (Lumina.Api\bin ve obj silinir, dotnet build ile yeniden olusur)
echo.
echo  Lumina Kelime (Excel) klasorune ve Excel dosyalarina DOKUNULMAZ.
echo  Visual Studio / VS Code'da Lumina.Api aciksa once kapatin.
echo.
set /p ONAY=Devam etmek icin E yazip Enter'a basin: 
if /i not "%ONAY%"=="E" (echo Iptal edildi. & pause & exit /b)

for %%F in (script.js auth.js firebase-config.js style.css futbol_words.js update_script.js update_script.py SQLQuery1.sql SQLQuery2.sql data\oxford3000.csv) do (
  if exist "%%F" (del /q "%%F" && echo Silindi: %%F)
)
for %%D in (Lumina.Api.New temp_extracted) do (
  if exist "%%D" (rmdir /s /q "%%D" && echo Silindi: %%D\)
)
if exist ".github\workflows" rmdir ".github\workflows" 2>nul
if exist ".github" rmdir ".github" 2>nul

if not exist server mkdir server
if exist "Lumina.Api" (
  if exist "Lumina.Api\bin" rmdir /s /q "Lumina.Api\bin"
  if exist "Lumina.Api\obj" rmdir /s /q "Lumina.Api\obj"
  move "Lumina.Api" "server\Lumina.Api" >nul && echo Tasindi: Lumina.Api -^> server\Lumina.Api
)
if exist "Database" (
  move "Database" "server\Database" >nul && echo Tasindi: Database -^> server\Database
)

echo.
echo Bitti. Uygulamayi Baslat.bat ile acip kontrol edin.
echo Bu temizlik dosyasi simdi kendini silecek.
pause
(goto) 2>nul & del "%~f0"
