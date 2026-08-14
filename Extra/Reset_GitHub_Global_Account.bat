@echo off
setlocal enabledelayedexpansion
color 0A
title Global GitHub Credentials Reset & Setup Tool

echo ========================================================
echo       GLOBAL GITHUB ACCOUNT RESET & SETUP TOOL
echo ========================================================
echo.
echo This script will reset saved GitHub credentials globally across:
echo  1. Windows Credential Manager
echo  2. Git Credential Manager Core
echo  3. Git Global Config (user.name and user.email)
echo.

echo [1/4] Deleting cached GitHub credentials from Windows Credential Manager...
cmdkey /delete:git:https://github.com >nul 2>&1
for /f "tokens=1,2 delims= " %%a in ('cmdkey /list ^| findstr /i "github"') do (
    cmdkey /delete:%%b >nul 2>&1
)

echo [2/4] Clearing Git Credential Manager sessions...
git credential-manager logout https://github.com >nul 2>&1

echo [3/4] Setting Global Git User Configuration...
set defaultUser=tejas7tpf-byte
set /p gitUser="Enter GitHub Username [Press ENTER for default '!defaultUser!']: "
if "!gitUser!"=="" set gitUser=!defaultUser!

set /p gitEmail="Enter GitHub Email (Press ENTER to skip): "

git config --global user.name "!gitUser!"
if not "!gitEmail!"=="" (
    git config --global user.email "!gitEmail!"
)

echo.
echo ========================================================
echo [4/4] SUCCESS! Global GitHub Credentials Reset Complete! ✅
echo.
echo Current Global Git User: !gitUser!
echo.
echo From now on, when you push from ANY project or terminal,
echo Windows will prompt for your NEW GitHub login!
echo ========================================================
echo.
pause
