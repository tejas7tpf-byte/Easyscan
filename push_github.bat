@echo off
color 0A
title EasyScan - Push to GitHub

echo =======================================
echo     EASYSCAN GITHUB PUSH SCRIPT
echo =======================================
echo.

cd /d "%~dp0"

echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing changes...
git commit -m "Update EasyScan %date% %time:~0,5%"

echo.
echo [3/3] Pushing to GitHub...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo =======================================
    echo    GITHUB PUSH SUCCESSFUL! ✅
    echo =======================================
) else (
    echo =======================================
    echo    ERROR: Push failed. ❌
    echo =======================================
)
echo.
pause
