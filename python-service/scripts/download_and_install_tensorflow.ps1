# 下载并安装 TensorFlow 2.10.1 GPU 版本
# 适用于 Windows Python 3.8 (64位)

Write-Host "=== TensorFlow 2.10.1 GPU 安装脚本 ===" -ForegroundColor Cyan
Write-Host ""

$pythonVersion = "3.8"
$tensorflowVersion = "2.10.1"
$wheelFile = "tensorflow-$tensorflowVersion-cp38-cp38-win_amd64.whl"

# 检查Python版本
Write-Host "检查Python版本..." -ForegroundColor Yellow
try {
    $pythonVersionOutput = & py -$pythonVersion --version 2>&1
    Write-Host "Python版本: $pythonVersionOutput" -ForegroundColor Green
} catch {
    Write-Host "错误: 无法找到Python $pythonVersion" -ForegroundColor Red
    exit 1
}

# 下载URL
$downloadUrl = "https://files.pythonhosted.org/packages/py3/t/tensorflow/$wheelFile"
$mirrorUrl = "https://pypi.tuna.tsinghua.edu.cn/packages/py3/t/tensorflow/$wheelFile"

# 下载文件
Write-Host "正在下载 TensorFlow $tensorflowVersion..." -ForegroundColor Yellow
Write-Host "文件: $wheelFile" -ForegroundColor Gray
Write-Host "大小: 约 500MB，请耐心等待..." -ForegroundColor Gray
Write-Host ""

$downloadPath = Join-Path $PSScriptRoot $wheelFile

# 尝试从镜像下载
try {
    Write-Host "尝试从清华镜像下载..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $mirrorUrl -OutFile $downloadPath -UseBasicParsing
    Write-Host "下载成功！" -ForegroundColor Green
} catch {
    Write-Host "镜像下载失败，尝试官方源..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing
        Write-Host "下载成功！" -ForegroundColor Green
    } catch {
        Write-Host "下载失败: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "请手动下载文件:" -ForegroundColor Yellow
        Write-Host "  $downloadUrl" -ForegroundColor Cyan
        Write-Host "或访问: https://pypi.org/project/tensorflow/$tensorflowVersion/#files" -ForegroundColor Cyan
        exit 1
    }
}

# 安装文件
Write-Host ""
Write-Host "正在安装 TensorFlow..." -ForegroundColor Yellow
try {
    & py -$pythonVersion -m pip install $downloadPath --no-cache-dir
    Write-Host "安装成功！" -ForegroundColor Green
} catch {
    Write-Host "安装失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 安装依赖
Write-Host ""
Write-Host "正在安装依赖包..." -ForegroundColor Yellow
try {
    & py -$pythonVersion -m pip install "numpy<1.24" "protobuf<4" "h5py<3.1.0" --no-cache-dir
    Write-Host "依赖安装完成！" -ForegroundColor Green
} catch {
    Write-Host "依赖安装警告: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 验证安装
Write-Host ""
Write-Host "验证安装..." -ForegroundColor Yellow
try {
    $tfVersion = & py -$pythonVersion -c "import tensorflow as tf; print(tf.__version__)" 2>&1
    Write-Host "TensorFlow 版本: $tfVersion" -ForegroundColor Green
    
    $gpuCount = & py -$pythonVersion -c "import tensorflow as tf; print(len(tf.config.list_physical_devices('GPU')))" 2>&1
    Write-Host "检测到的GPU数量: $gpuCount" -ForegroundColor $(if ($gpuCount -gt 0) { "Green" } else { "Yellow" })
    
    if ($gpuCount -eq 0) {
        Write-Host ""
        Write-Host "注意: 未检测到GPU，需要安装CUDA和cuDNN才能使用GPU加速" -ForegroundColor Yellow
        Write-Host "参考: INSTALL-SUMMARY.md" -ForegroundColor Cyan
    }
} catch {
    Write-Host "验证失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 安装完成 ===" -ForegroundColor Green
