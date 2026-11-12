@echo off
rem Run this from the project root (C:\Users\User\FYP-FoodOrderingPlatform) after copying the zip contents over the project.
cd apps\customer-app
call npm install --legacy-peer-deps
cd ..\..
echo.
echo Done. Now add your Google client ID (see the steps in chat), then run: npm test  (inside backend) to check.
