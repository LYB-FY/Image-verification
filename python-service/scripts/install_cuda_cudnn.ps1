# CUDA 11.2 和 cuDNN 8.1 安装辅助脚本
# 适用于 TensorFlow 2.10.1

Write-Host "=== CUDA 11.2 和 cuDNN 8.1 安装指南 ===" -ForegroundColor Cyan
Write-Host ""

# 检查 CUDA 是否已安装
Write-Host "检查 CUDA 安装状态..." -ForegroundColor Yellow
$cudaInstalled = $false
$cudaVersion = ""

try {
    $nvccOutput = & nvcc --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $cudaInstalled = $true
        if ($nvccOutput -match "release (\d+\.\d+)") {
            $cudaVersion = $matches[1]
        }
        Write-Host "检测到 CUDA 版本: $cudaVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "未检测到 CUDA" -ForegroundColor Yellow
}

# 检查 cuDNN
Write-Host ""
Write-Host "检查 cuDNN 安装状态..." -ForegroundColor Yellow
$cudnnInstalled = $false
$cudaPath = "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2"
$cudnnDll = Join-Path $cudaPath "bin\cudnn64_8.dll"

if (Test-Path $cudnnDll) {
    $cudnnInstalled = $true
    Write-Host "检测到 cuDNN 8.x" -ForegroundColor Green
} else {
    Write-Host "未检测到 cuDNN" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 安装步骤 ===" -ForegroundColor Cyan
Write-Host ""

if (-not $cudaInstalled) {
    Write-Host "第一步：安装 CUDA 11.2" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 访问下载页面：" -ForegroundColor White
    Write-Host "   https://developer.nvidia.com/cuda-11.2.0-download-archive" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. 选择以下选项：" -ForegroundColor White
    Write-Host "   - Operating System: Windows" -ForegroundColor Gray
    Write-Host "   - Architecture: x86_64" -ForegroundColor Gray
    Write-Host "   - Version: 10/11" -ForegroundColor Gray
    Write-Host "   - Installer Type: exe (local) [推荐]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. 下载并运行安装程序" -ForegroundColor White
    Write-Host "4. 选择 'Express' 安装（推荐）" -ForegroundColor White
    Write-Host "5. 安装完成后重启计算机" -ForegroundColor White
    Write-Host ""
} else {
    if ($cudaVersion -ne "11.2") {
        Write-Host "⚠️  警告：检测到 CUDA $cudaVersion，但 TensorFlow 2.10.1 需要 CUDA 11.2" -ForegroundColor Yellow
        Write-Host "   建议安装 CUDA 11.2 以获得最佳兼容性" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "✅ CUDA 11.2 已安装" -ForegroundColor Green
        Write-Host ""
    }
}

if (-not $cudnnInstalled) {
    Write-Host "第二步：安装 cuDNN 8.1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 访问下载页面（需要注册 NVIDIA 开发者账号）：" -ForegroundColor White
    Write-Host "   https://developer.nvidia.com/rdp/cudnn-archive" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. 下载：cuDNN v8.1.1 for CUDA 11.2" -ForegroundColor White
    Write-Host "   选择：Windows x64 版本" -ForegroundColor White
    Write-Host ""
    Write-Host "3. 解压下载的 zip 文件" -ForegroundColor White
    Write-Host ""
    Write-Host "4. 找到 CUDA 安装目录（通常是）：" -ForegroundColor White
    Write-Host "   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. 将 cuDNN 文件复制到 CUDA 目录：" -ForegroundColor White
    Write-Host "   - 复制 bin\* → CUDA\v11.2\bin\" -ForegroundColor Gray
    Write-Host "   - 复制 include\* → CUDA\v11.2\include\" -ForegroundColor Gray
    Write-Host "   - 复制 lib\x64\* → CUDA\v11.2\lib\x64\" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "✅ cuDNN 已安装" -ForegroundColor Green
    Write-Host ""
}

Write-Host "第三步：配置环境变量" -ForegroundColor Yellow
Write-Host ""
Write-Host "将以下路径添加到系统 PATH 环境变量：" -ForegroundColor White
Write-Host ""
$paths = @(
    "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\bin",
    "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\libnvvp",
    "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\include",
    "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\lib\x64",
    "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\lib64",
    "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\include"
)

foreach ($path in $paths) {
    Write-Host "   $path" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "配置方法：" -ForegroundColor White
Write-Host "1. 右键 '此电脑' → '属性'" -ForegroundColor Gray
Write-Host "2. 点击 '高级系统设置'" -ForegroundColor Gray
Write-Host "3. 点击 '环境变量'" -ForegroundColor Gray
Write-Host "4. 在 '系统变量' 中找到 Path，点击 '编辑'" -ForegroundColor Gray
Write-Host "5. 点击 '新建'，逐个添加上述路径" -ForegroundColor Gray
Write-Host "6. 点击 '确定' 保存所有更改" -ForegroundColor Gray
Write-Host ""

Write-Host "第四步：重启计算机" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  重要：配置环境变量后必须重启计算机！" -ForegroundColor Red
Write-Host ""

Write-Host "第五步：验证安装" -ForegroundColor Yellow
Write-Host ""
Write-Host "重启后，运行以下命令验证：" -ForegroundColor White
Write-Host "   nvcc --version" -ForegroundColor Cyan
Write-Host "   python-service\scripts\check_gpu.py" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== 快速验证命令 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "安装完成后，运行以下 Python 代码验证 GPU 支持：" -ForegroundColor White
Write-Host ""
Write-Host 'py -3.9 -c "import tensorflow as tf; print(''TensorFlow:'', tf.__version__); print(''GPU 设备:'', tf.config.list_physical_devices(''GPU''))"' -ForegroundColor Cyan
Write-Host ""

if ($cudaInstalled -and $cudnnInstalled) {
    Write-Host "✅ CUDA 和 cuDNN 已安装，请确保环境变量已配置并已重启计算机" -ForegroundColor Green
} else {
    Write-Host "请按照上述步骤完成安装" -ForegroundColor Yellow
}
