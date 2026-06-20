@echo off
chcp 65001 >nul
title JJR Controle Contábil - Servidor
cd /d "%~dp0"

:: Garante que o Node.js seja encontrado mesmo sem reiniciar o PC
set PATH=%PATH%;C:\Program Files\nodejs

echo.
echo  =========================================
echo   JJR Controle Contábil
echo   Iniciando servidor em localhost:3000
echo  =========================================
echo.

echo Iniciando Node.js...
node serve.js
pause
