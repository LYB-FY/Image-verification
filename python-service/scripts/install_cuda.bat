@echo off
chcp 65001 >nul
echo ========================================
echo CUDA 11.2 安装助手
echo ========================================
echo.

echo 检查 CUDA 安装状态...
nvcc --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] 检测到 CUDA 已安装
    nvcc --version
    echo.
    echo 如果版本不是 11.2，可以继续安装 CUDA 11.2
    echo.
) else (
    echo [INFO] 未检测到 CUDA
    echo.
)

echo ========================================
echo 下载和安装步骤：
echo ========================================
echo.
echo 1. 正在打开 CUDA 11.2 下载页面...
echo.
start https://developer.nvidia.com/cuda-11.2.0-download-archive
echo.
echo 2. 在下载页面选择以下选项：
echo    - Operating System: Windows
echo    - Architecture: x86_64
echo    - Version: 10/11
echo    - Installer Type: exe (local) [推荐，约3GB]
echo.
echo 3. 下载完成后，运行安装程序
echo    选择 "Express" 安装（推荐）
echo.
echo 4. 安装完成后，必须重启计算机
echo.
echo ========================================
echo 安装完成后验证：
echo ========================================
echo.
echo 重启后运行以下命令验证：
echo   nvcc --version
echo.
echo ========================================
pause
