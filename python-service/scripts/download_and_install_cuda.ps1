# CUDA 11.2 自动下载和安装脚本
# 适用于 TensorFlow 2.10.1

Write-Host "=== CUDA 11.2 自动安装脚本 ===" -ForegroundColor Cyan
Write-Host ""

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  警告：建议以管理员身份运行此脚本以获得最佳体验" -ForegroundColor Yellow
    Write-Host ""
}

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
        Write-Host "✅ 检测到 CUDA 版本: $cudaVersion" -ForegroundColor Green
        if ($cudaVersion -eq "11.2") {
            Write-Host "✅ CUDA 11.2 已安装，无需重新安装" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "⚠️  当前版本为 $cudaVersion，但项目需要 CUDA 11.2" -ForegroundColor Yellow
            Write-Host "   可以同时安装多个 CUDA 版本" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "未检测到 CUDA" -ForegroundColor Yellow
}

Write-Host ""

# CUDA 11.2 下载信息
$cudaVersion = "11.2.0"
$cudaBuild = "460.89"
$cudaFileName = "cuda_${cudaVersion}_${cudaBuild}_windows.exe"
$downloadUrl = "https://developer.download.nvidia.com/compute/cuda/${cudaVersion}/local_installers/${cudaFileName}"
$downloadDir = "$env:USERPROFILE\Downloads"
$installerPath = Join-Path $downloadDir $cudaFileName

Write-Host "=== 下载信息 ===" -ForegroundColor Cyan
Write-Host "CUDA 版本: $cudaVersion" -ForegroundColor White
Write-Host "文件名: $cudaFileName" -ForegroundColor White
Write-Host "下载目录: $downloadDir" -ForegroundColor White
Write-Host "安装程序路径: $installerPath" -ForegroundColor White
Write-Host ""

# 检查文件是否已存在
if (Test-Path $installerPath) {
    Write-Host "✅ 安装程序已存在于: $installerPath" -ForegroundColor Green
    Write-Host "   文件大小: $([math]::Round((Get-Item $installerPath).Length / 1GB, 2)) GB" -ForegroundColor Gray
    Write-Host ""
    $useExisting = Read-Host "是否使用现有文件？(Y/N)"
    if ($useExisting -eq "N" -or $useExisting -eq "n") {
        $shouldDownload = $true
    } else {
        $shouldDownload = $false
    }
} else {
    $shouldDownload = $true
}

# 下载 CUDA
if ($shouldDownload) {
    Write-Host "=== 开始下载 CUDA 11.2 ===" -ForegroundColor Cyan
    Write-Host "下载链接: $downloadUrl" -ForegroundColor Gray
    Write-Host "文件大小: 约 3 GB" -ForegroundColor Gray
    Write-Host "这可能需要一些时间，请耐心等待..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        # 确保下载目录存在
        if (-not (Test-Path $downloadDir)) {
            New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
        }
        
        # 下载文件
        Write-Host "正在下载..." -ForegroundColor Yellow
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
        
        if (Test-Path $installerPath) {
            $fileSize = (Get-Item $installerPath).Length / 1GB
            Write-Host "✅ 下载完成！" -ForegroundColor Green
            Write-Host "   文件大小: $([math]::Round($fileSize, 2)) GB" -ForegroundColor Gray
        } else {
            Write-Host "❌ 下载失败：文件不存在" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ 下载失败: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "请手动下载 CUDA 11.2：" -ForegroundColor Yellow
        Write-Host "1. 访问: https://developer.nvidia.com/cuda-11.2.0-download-archive" -ForegroundColor Cyan
        Write-Host "2. 选择: Windows → x86_64 → 10/11 → exe (local)" -ForegroundColor Cyan
        Write-Host "3. 下载后运行安装程序" -ForegroundColor Cyan
        exit 1
    }
}

Write-Host ""
Write-Host "=== 安装 CUDA 11.2 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  重要提示：" -ForegroundColor Yellow
Write-Host "1. 安装过程可能需要 10-30 分钟" -ForegroundColor White
Write-Host "2. 建议选择 'Express' 安装（默认选项）" -ForegroundColor White
Write-Host "3. 安装完成后必须重启计算机" -ForegroundColor White
Write-Host ""

$startInstall = Read-Host "是否现在启动安装程序？(Y/N)"
if ($startInstall -eq "Y" -or $startInstall -eq "y") {
    Write-Host ""
    Write-Host "正在启动安装程序..." -ForegroundColor Yellow
    Start-Process -FilePath $installerPath -Wait
    
    Write-Host ""
    Write-Host "=== 安装完成 ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  重要：请立即重启计算机！" -ForegroundColor Red
    Write-Host ""
    Write-Host "重启后，运行以下命令验证安装：" -ForegroundColor Yellow
    Write-Host "   nvcc --version" -ForegroundColor Cyan
    Write-Host ""
    
    $restartNow = Read-Host "是否现在重启计算机？(Y/N)"
    if ($restartNow -eq "Y" -or $restartNow -eq "y") {
        Write-Host "正在重启计算机..." -ForegroundColor Yellow
        Restart-Computer -Force
    } else {
        Write-Host "请稍后手动重启计算机" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "安装程序位置: $installerPath" -ForegroundColor Cyan
    Write-Host "请稍后手动运行安装程序" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "安装步骤：" -ForegroundColor Yellow
    Write-Host "1. 双击运行安装程序" -ForegroundColor White
    Write-Host "2. 选择 'Express' 安装" -ForegroundColor White
    Write-Host "3. 等待安装完成" -ForegroundColor White
    Write-Host "4. 重启计算机" -ForegroundColor White
}
