# Python版本要求

## 问题说明

TensorFlow 目前不支持 Python 3.14。TensorFlow 2.15+ 支持的 Python 版本为：
- Python 3.9
- Python 3.10
- Python 3.11
- Python 3.12
- Python 3.13（部分版本）

## 解决方案

### 方案1：安装Python 3.11或3.12（推荐）

1. 从 [Python官网](https://www.python.org/downloads/) 下载 Python 3.11 或 3.12
2. 安装时选择"Add Python to PATH"
3. 使用以下命令验证安装：

```bash
py -3.11 --version  # 或 py -3.12 --version
```

4. 使用指定版本创建虚拟环境：

```bash
# 使用Python 3.11
py -3.11 -m venv venv

# 或使用Python 3.12
py -3.12 -m venv venv
```

5. 激活虚拟环境：

```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows CMD
venv\Scripts\activate.bat
```

6. 安装依赖：

```bash
pip install -r requirements.txt
```

### 方案2：使用Docker（推荐用于生产环境）

Dockerfile 中已配置使用 Python 3.10，可以直接使用：

```bash
docker-compose up --build
```

### 方案3：使用conda环境

```bash
# 创建conda环境（Python 3.11）
conda create -n image-verification python=3.11
conda activate image-verification

# 安装依赖
pip install -r requirements.txt
```

## 验证安装

安装完成后，运行以下命令验证：

```bash
python --version  # 应该显示 3.11.x 或 3.12.x
python -c "import tensorflow as tf; print(tf.__version__)"
```

## 当前系统状态

- 检测到的Python版本：3.14.2
- TensorFlow支持状态：❌ 不支持
- 建议操作：安装Python 3.11或3.12
