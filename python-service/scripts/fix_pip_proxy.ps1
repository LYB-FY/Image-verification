# 修复pip代理问题的脚本
# 使用方法: powershell -ExecutionPolicy Bypass -File fix_pip_proxy.ps1

Write-Host "正在修复pip代理配置..." -ForegroundColor Yellow

# 清除环境变量中的代理设置
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:http_proxy = ""
$env:https_proxy = ""
$env:NO_PROXY = "*"

# 创建pip配置目录
$pipDir = "$env:APPDATA\pip"
if (-not (Test-Path $pipDir)) {
    New-Item -ItemType Directory -Path $pipDir -Force | Out-Null
}

# 创建pip配置文件，明确禁用代理
$pipConfig = @"
[global]
index-url = https://pypi.tuna.tsinghua.edu.cn/simple
trusted-host = pypi.tuna.tsinghua.edu.cn
proxy = 
"@

# 使用ASCII编码保存配置文件
$pipConfig | Out-File -FilePath "$pipDir\pip.ini" -Encoding ASCII -Force

Write-Host "pip配置文件已更新: $pipDir\pip.ini" -ForegroundColor Green
Write-Host ""
Write-Host "现在可以尝试安装TensorFlow:" -ForegroundColor Green
Write-Host "py -3.8 -m pip install tensorflow==2.10.0" -ForegroundColor Cyan
