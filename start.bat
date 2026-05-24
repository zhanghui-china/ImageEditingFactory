@echo off
echo ========================================
echo   SenseNova 多模型 AI 对话平台
echo ========================================
echo.
echo [1/2] 正在安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo 依赖安装失败，请检查网络连接
    pause
    exit /b 1
)
echo.
echo [2/2] 启动开发服务器...
echo.
call npm run dev
pause
