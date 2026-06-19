@echo off
chcp 65001 >nul
title JJR Controle Contábil - Servidor
cd /d "%~dp0"

echo.
echo  =========================================
echo   JJR Controle Contábil
echo   Iniciando servidor em localhost:3000
echo  =========================================
echo.

if not exist node_modules (
    echo Instalando dependências...
    call npm install
    if errorlevel 1 (
        echo ERRO ao instalar dependências
        pause
        exit /b 1
    )
)

echo Iniciando Node.js...
node serve.js
pause
