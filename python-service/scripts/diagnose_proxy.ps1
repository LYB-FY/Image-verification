# pip代理问题诊断脚本
Write-Host "=== pip 代理问题诊断 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查环境变量
Write-Host "1. 检查环境变量中的代理设置:" -ForegroundColor Yellow
$proxyVars = Get-ChildItem Env: | Where-Object { $_.Name -like "*PROXY*" -or $_.Name -like "*proxy*" }
if ($proxyVars) {
    $proxyVars | Format-Table Name, Value -AutoSize
    Write-Host "发现代理环境变量！" -ForegroundColor Red
} else {
    Write-Host "未发现代理环境变量" -ForegroundColor Green
}
Write-Host ""

# 2. 检查pip配置文件
Write-Host "2. 检查pip配置文件:" -ForegroundColor Yellow
$pipConfigs = @(
    "$env:APPDATA\pip\pip.ini",
    "$env:PROGRAMDATA\pip\pip.ini",
    "$PSScriptRoot\..\pip.ini"
)

foreach ($config in $pipConfigs) {
    if (Test-Path $config) {
        Write-Host "发现配置文件: $config" -ForegroundColor Yellow
        Write-Host "内容:" -ForegroundColor Gray
        Get-Content $config
        Write-Host ""
    }
}

# 3. 检查系统代理设置
Write-Host "3. 检查系统代理设置:" -ForegroundColor Yellow
try {
    $proxy = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings").ProxyEnable
    if ($proxy -eq 1) {
        $proxyServer = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings").ProxyServer
        Write-Host "系统代理已启用: $proxyServer" -ForegroundColor Red
    } else {
        Write-Host "系统代理未启用" -ForegroundColor Green
    }
} catch {
    Write-Host "无法检查系统代理设置" -ForegroundColor Gray
}
Write-Host ""

# 4. 测试网络连接
Write-Host "4. 测试网络连接:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://pypi.org" -TimeoutSec 5 -UseBasicParsing
    Write-Host "可以连接到 PyPI 官方源" -ForegroundColor Green
} catch {
    Write-Host "无法连接到 PyPI 官方源: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "https://pypi.tuna.tsinghua.edu.cn/simple" -TimeoutSec 5 -UseBasicParsing
    Write-Host "可以连接到清华镜像源" -ForegroundColor Green
} catch {
    Write-Host "无法连接到清华镜像源: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 5. 提供解决方案
Write-Host "=== 解决方案 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "如果发现代理问题，可以尝试以下方法:" -ForegroundColor Yellow
Write-Host ""
Write-Host "方法1: 清除所有代理环境变量" -ForegroundColor Green
Write-Host '  $env:HTTP_PROXY = ""' -ForegroundColor Gray
Write-Host '  $env:HTTPS_PROXY = ""' -ForegroundColor Gray
Write-Host '  $env:http_proxy = ""' -ForegroundColor Gray
Write-Host '  $env:https_proxy = ""' -ForegroundColor Gray
Write-Host ""
Write-Host "方法2: 修改pip配置文件，明确禁用代理" -ForegroundColor Green
Write-Host '  $pipDir = "$env:APPDATA\pip"' -ForegroundColor Gray
Write-Host '  if (-not (Test-Path $pipDir)) { New-Item -ItemType Directory -Path $pipDir -Force }' -ForegroundColor Gray
Write-Host '  "[global]`nindex-url = https://pypi.tuna.tsinghua.edu.cn/simple`ntrusted-host = pypi.tuna.tsinghua.edu.cn`nproxy =" | Out-File -FilePath "$pipDir\pip.ini" -Encoding ASCII -Force' -ForegroundColor Gray
Write-Host ""
Write-Host "方法3: 使用conda安装（如果已安装Anaconda/Miniconda）" -ForegroundColor Green
Write-Host '  conda install -c conda-forge tensorflow=2.10.0' -ForegroundColor Gray
Write-Host ""
Write-Host "方法4: 手动下载wheel文件安装" -ForegroundColor Green
Write-Host "  参考: scripts/manual_install_tensorflow.md" -ForegroundColor Gray
