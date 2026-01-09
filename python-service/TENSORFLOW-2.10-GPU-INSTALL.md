# TensorFlow 2.10 GPU 完整安装指南

## ⚠️ 重要提示

**当前检测到的问题：**
1. Python 3.8 是 **32位版本**，TensorFlow 需要 **64位 Python**
2. pip 存在代理配置问题

## 第一步：安装 64位 Python 3.8

### 1. 下载 Python 3.8 (64位)

- 访问：https://www.python.org/downloads/release/python-3810/
- 下载：**Windows x86-64 executable installer**（不是 x86）
- 文件名类似：`python-3.8.10-amd64.exe`

### 2. 安装 Python 3.8 (64位)

1. 运行安装程序
2. **重要**：勾选 "Add Python 3.8 to PATH"
3. 选择 "Install Now" 或 "Customize installation"
4. 如果选择自定义安装，确保勾选所有可选组件

### 3. 验证安装

打开新的命令提示符（CMD）或 PowerShell，运行：

```bash
py -3.8 --version
py -3.8 -c "import platform; print(platform.architecture())"
```

应该显示：
- Python 3.8.x
- `('64bit', 'WindowsPE')` ← 必须是64位！

## 第二步：配置 pip（解决代理问题）

### 方法一：取消代理设置（推荐）

在命令提示符中运行：

```cmd
set HTTP_PROXY=
set HTTPS_PROXY=
set http_proxy=
set https_proxy=
```

或者在 PowerShell 中：

```powershell
$env:HTTP_PROXY=""
$env:HTTPS_PROXY=""
$env:http_proxy=""
$env:https_proxy=""
```

### 方法二：配置 pip 使用国内镜像

创建或编辑 pip 配置文件：

**Windows 位置：** `%APPDATA%\pip\pip.ini`

创建文件并添加：

```ini
[global]
index-url = https://pypi.tuna.tsinghua.edu.cn/simple
trusted-host = pypi.tuna.tsinghua.edu.cn
```

## 第三步：安装 TensorFlow 2.10.0

在配置好 pip 后，运行：

```bash
py -3.8 -m pip install --upgrade pip
py -3.8 -m pip install tensorflow==2.10.0
```

如果使用镜像源：

```bash
py -3.8 -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple tensorflow==2.10.0
```

## 第四步：安装 CUDA 11.2

TensorFlow 2.10.0 需要 **CUDA 11.2** 和 **cuDNN 8.1**

### 1. 下载 CUDA 11.2

- 访问：https://developer.nvidia.com/cuda-11.2.0-download-archive
- 选择：
  - Operating System: **Windows**
  - Architecture: **x86_64**
  - Version: **10/11**
  - Installer Type: **exe (local)**（推荐）或 **network**

### 2. 安装 CUDA 11.2

1. 运行下载的安装程序
2. 选择 "Express" 安装（推荐）或 "Custom"
3. 等待安装完成
4. **重要**：安装完成后重启计算机

### 3. 验证 CUDA 安装

重启后，打开新的命令提示符，运行：

```bash
nvcc --version
```

应该显示 CUDA 11.2 的版本信息。

## 第五步：安装 cuDNN 8.1

### 1. 下载 cuDNN 8.1

- 访问：https://developer.nvidia.com/rdp/cudnn-archive
- 需要注册 NVIDIA 开发者账号（免费）
- 下载：**cuDNN v8.1.1 for CUDA 11.2**
- 选择：**Windows x64** 版本

### 2. 安装 cuDNN

cuDNN 是一个压缩包，需要手动解压并复制文件：

1. 解压下载的 cuDNN zip 文件
2. 打开解压后的文件夹，应该看到：
   - `bin/`
   - `include/`
   - `lib/`

3. 找到 CUDA 安装目录（通常是）：
   ```
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2
   ```

4. 将 cuDNN 的文件复制到 CUDA 目录：
   - 复制 `bin\*` → `CUDA\v11.2\bin\`
   - 复制 `include\*` → `CUDA\v11.2\include\`
   - 复制 `lib\x64\*` → `CUDA\v11.2\lib\x64\`

### 3. 验证 cuDNN 安装

检查文件是否存在：

```bash
dir "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\bin\cudnn64_8.dll"
```

如果文件存在，说明安装成功。

## 第六步：配置环境变量

### 1. 添加 CUDA 到 PATH

1. 右键 "此电脑" → "属性"
2. 点击 "高级系统设置"
3. 点击 "环境变量"
4. 在 "系统变量" 中找到 `Path`，点击 "编辑"
5. 添加以下路径（如果不存在）：

```
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\bin
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\libnvvp
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\include
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\lib\x64
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\lib64
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\include
```

6. 点击 "确定" 保存

### 2. 重启计算机

**重要**：配置环境变量后必须重启计算机！

## 第七步：验证 GPU 支持

重启后，运行 GPU 检查脚本：

```bash
cd python-service
py -3.8 scripts/check_gpu.py
```

或者运行 Python 代码验证：

```python
import tensorflow as tf

print("TensorFlow 版本:", tf.__version__)
print("GPU 设备数量:", len(tf.config.list_physical_devices('GPU')))
print("GPU 设备:", tf.config.list_physical_devices('GPU'))

# 测试 GPU 是否可用
if tf.config.list_physical_devices('GPU'):
    print("\n✅ GPU 配置成功！")
    with tf.device('/GPU:0'):
        a = tf.constant([[1.0, 2.0], [3.0, 4.0]])
        b = tf.constant([[1.0, 1.0], [0.0, 1.0]])
        c = tf.matmul(a, b)
        print("GPU 计算测试:", c.numpy())
else:
    print("\n❌ 未检测到 GPU")
```

## 常见问题

### Q1: 安装 TensorFlow 时提示 "No matching distribution found"

**原因：**
- Python 是 32 位版本
- pip 代理配置错误
- 网络连接问题

**解决方案：**
1. 确保使用 64 位 Python
2. 取消代理设置或配置正确的代理
3. 使用国内镜像源

### Q2: 安装 CUDA 后 nvcc 命令不可用

**原因：** 环境变量未配置或未重启

**解决方案：**
1. 检查 PATH 环境变量
2. 重启计算机
3. 打开新的命令提示符窗口

### Q3: TensorFlow 无法检测到 GPU

**检查清单：**
- ✅ CUDA 11.2 已安装
- ✅ cuDNN 8.1 已安装
- ✅ 环境变量已配置
- ✅ 已重启计算机
- ✅ NVIDIA 驱动程序是最新版本
- ✅ Python 是 64 位版本

### Q4: 如何卸载旧版本 TensorFlow？

```bash
py -3.8 -m pip uninstall tensorflow tensorflow-gpu tensorflow-intel -y
```

## 版本兼容性参考

| TensorFlow 版本 | CUDA 版本 | cuDNN 版本 | Python 版本 |
|----------------|-----------|------------|-------------|
| 2.10.0         | 11.2      | 8.1        | 3.7-3.10    |

## 参考链接

- [TensorFlow GPU 支持](https://www.tensorflow.org/install/gpu)
- [CUDA 11.2 下载](https://developer.nvidia.com/cuda-11.2.0-download-archive)
- [cuDNN 下载](https://developer.nvidia.com/rdp/cudnn-archive)
- [Python 3.8 下载](https://www.python.org/downloads/release/python-3810/)

## 快速安装脚本

安装好 64 位 Python 3.8 后，可以运行以下命令快速安装：

```bash
# 升级 pip
py -3.8 -m pip install --upgrade pip

# 安装 TensorFlow 2.10
py -3.8 -m pip install tensorflow==2.10.0

# 验证安装
py -3.8 -c "import tensorflow as tf; print('TensorFlow:', tf.__version__); print('GPU:', len(tf.config.list_physical_devices('GPU')))"
```

**注意**：CUDA 和 cuDNN 需要手动下载和安装，无法通过 pip 安装。
