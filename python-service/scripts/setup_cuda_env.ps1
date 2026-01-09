# 自动配置 CUDA 环境变量脚本
# 注意：需要管理员权限

Write-Host "=== CUDA 环境变量配置脚本 ===" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  警告：此脚本需要管理员权限" -ForegroundColor Yellow
    Write-Host "   请右键点击 PowerShell，选择 '以管理员身份运行'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   或者手动配置环境变量（参考 install_cuda_cudnn.ps1）" -ForegroundColor Yellow
    exit 1
}

$cudaPath = "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2"

# 检查 CUDA 是否安装
if (-not (Test-Path $cudaPath)) {
    Write-Host "❌ 错误：未找到 CUDA 11.2 安装目录" -ForegroundColor Red
    Write-Host "   路径: $cudaPath" -ForegroundColor Gray
    Write-Host "   请先安装 CUDA 11.2" -ForegroundColor Yellow
    exit 1
}

Write-Host "检测到 CUDA 安装目录: $cudaPath" -ForegroundColor Green
Write-Host ""

# 要添加的路径
$pathsToAdd = @(
    "$cudaPath\bin",
    "$cudaPath\libnvvp",
    "$cudaPath\include",
    "$cudaPath\lib\x64",
    "$cudaPath\extras\CUPTI\lib64",
    "$cudaPath\extras\CUPTI\include"
)

# 获取当前 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

Write-Host "正在添加 CUDA 路径到系统 PATH..." -ForegroundColor Yellow

$pathsAdded = 0
$newPath = $currentPath

foreach ($path in $pathsToAdd) {
    if (Test-Path $path) {
        if ($currentPath -notlike "*$path*") {
            $newPath = "$newPath;$path"
            Write-Host "  ✅ 添加: $path" -ForegroundColor Green
            $pathsAdded++
        } else {
            Write-Host "  ⏭️  已存在: $path" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️  路径不存在: $path" -ForegroundColor Yellow
    }
}

if ($pathsAdded -gt 0) {
    try {
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
        Write-Host ""
        Write-Host "✅ 成功添加 $pathsAdded 个路径到系统 PATH" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  重要：请重启计算机以使环境变量生效！" -ForegroundColor Red
    } catch {
        Write-Host ""
        Write-Host "❌ 错误：无法设置环境变量" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "所有路径已存在于 PATH 中" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== 配置完成 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "1. 重启计算机" -ForegroundColor White
Write-Host "2. 运行验证命令: nvcc --version" -ForegroundColor White
Write-Host "3. 运行 GPU 检查: python-service\scripts\check_gpu.py" -ForegroundColor White
