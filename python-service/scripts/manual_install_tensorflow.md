# 手动安装 TensorFlow 2.10.0 指南

由于代理配置问题，如果自动安装失败，可以尝试以下方法：

## 方法一：使用 conda（推荐）

如果您安装了 Anaconda 或 Miniconda：

```bash
# 创建新环境（可选）
conda create -n tf210 python=3.8
conda activate tf210

# 安装 TensorFlow 2.10
conda install -c conda-forge tensorflow=2.10.0
```

## 方法二：手动下载 wheel 文件安装

### 1. 下载 TensorFlow wheel 文件

访问以下链接下载对应您系统的 wheel 文件：

**Windows 64位 Python 3.8:**
- https://files.pythonhosted.org/packages/py3/t/tensorflow/tensorflow-2.10.0-cp38-cp38-win_amd64.whl

或者使用其他镜像：
- 清华大学镜像：https://mirrors.tuna.tsinghua.edu.cn/pypi/web/packages/tensorflow/
- 阿里云镜像：https://mirrors.aliyun.com/pypi/simple/tensorflow/

### 2. 安装下载的 wheel 文件

```bash
# 将下载的 .whl 文件放到项目目录
py -3.8 -m pip install tensorflow-2.10.0-cp38-cp38-win_amd64.whl
```

### 3. 安装依赖

TensorFlow 2.10.0 还需要一些依赖包，可能需要单独安装：

```bash
py -3.8 -m pip install numpy<1.24 protobuf<4 h5py<3.1.0
```

## 方法三：修复系统代理设置

代理问题可能来自系统级别的配置：

### 1. 检查系统代理设置

1. 打开"设置" → "网络和Internet" → "代理"
2. 检查是否启用了代理服务器
3. 如果不需要，可以关闭代理

### 2. 检查环境变量

在 PowerShell 中运行：

```powershell
Get-ChildItem Env: | Where-Object { $_.Name -like "*PROXY*" }
```

如果发现有代理相关的环境变量，可以临时清除：

```powershell
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:http_proxy = ""
$env:https_proxy = ""
```

### 3. 检查 pip 配置

检查所有可能的 pip 配置文件：

```powershell
# 用户配置
Test-Path "$env:APPDATA\pip\pip.ini"
Get-Content "$env:APPDATA\pip\pip.ini" -ErrorAction SilentlyContinue

# 系统配置
Test-Path "$env:PROGRAMDATA\pip\pip.ini"
Get-Content "$env:PROGRAMDATA\pip\pip.ini" -ErrorAction SilentlyContinue

# 虚拟环境配置（如果有）
Test-Path "pip.ini"
```

## 方法四：使用代理工具

如果您确实需要使用代理，可以配置正确的代理：

1. 在 pip 配置文件中设置正确的代理地址
2. 或者使用代理工具如 Clash、V2Ray 等

## 验证安装

安装完成后，运行：

```bash
py -3.8 -c "import tensorflow as tf; print('TensorFlow版本:', tf.__version__)"
```

如果成功，会显示 TensorFlow 2.10.0。
