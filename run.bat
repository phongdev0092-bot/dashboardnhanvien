@echo off
chcp 65001 > nul
title Dashboard Quan Ly Nhan Vien - Google Sheets Live
color 0A

echo =====================================================================
echo          HE THONG WEB DASHBOARD QUAN LY THONG TIN NHAN VIEN
echo               Doc du lieu truc tiep tu Google Sheets
echo =====================================================================
echo.

:: Kiem tra Python da duoc cai dat chua
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Python tren he thong!
    echo Vui long cai dat Python 3.11 tro len tu https://www.python.org/
    echo Va nho tich vao o "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

:: Kiem tra file .env
if not exist .env (
    echo [THONG BAO] Chua tim thay file .env, dang khoi tao tu .env.example...
    copy .env.example .env >nul
    echo Da tao file .env mac dinh thanh cong!
    echo.
)

:: Cai dat cac thu vien can thiet
echo [1/3] Dang kiem tra va cai dat thu vien can thiet...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [CANH BAO] Co van de khi cai dat thu vien qua pip. Thu tiep tuc chay...
)

echo [2/3] Dang khoi dong Web Server FastAPI + Uvicorn...
echo.
echo =====================================================================
echo   Dashboard dang hoat dong tai: http://127.0.0.1:8000
echo   De dung may chu, hay nhan to hop phim [Ctrl + C]
echo =====================================================================
echo.

:: Tu dong mo trinh duyet sau 2 giay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:8000"

:: Khoi dong server
python main.py

pause
