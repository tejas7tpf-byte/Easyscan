@echo off
color 0A
title Git Login For Updates
echo ========================================================
echo       GIT LOGIN FOR UPDATES - ACCOUNT RESET & LOGIN
echo ========================================================
echo.

echo [1/3] Logging out of current GitHub Account...
cmdkey /delete:git:https://github.com >nul 2>&1
for /f "tokens=1,2 delims= " %%a in ('cmdkey /list ^| findstr /i "github"') do (
    cmdkey /delete:%%b >nul 2>&1
)
git credential-manager logout https://github.com >nul 2>&1

echo [2/3] Clearing global user config...
git config --global --unset user.name >nul 2>&1
git config --global --unset user.email >nul 2>&1

echo.
echo [3/3] Opening GitHub Login Screen...
echo ========================================================
echo.

git credential-manager github login

echo.
echo ========================================================
echo Login process finished! You can now use your account.
echo ========================================================
echo.
pause
