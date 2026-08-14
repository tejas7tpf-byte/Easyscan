@echo off
color 0A
title Open GitHub Login Dialog
echo ========================================================
echo        OPENING GITHUB LOGIN WINDOW...
echo ========================================================
echo.
echo Deleting old saved session first...
cmdkey /delete:git:https://github.com >nul 2>&1

echo Launching 'Connect to GitHub' popup...
git credential-manager github login

echo.
pause
