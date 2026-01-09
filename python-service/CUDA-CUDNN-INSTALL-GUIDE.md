# CUDA 11.2 和 cuDNN 8.1 安装指南

适用于 **TensorFlow 2.10.1**

## 📋 系统要求

- **操作系统**: Windows 10/11 (64位)
- **GPU**: NVIDIA GPU（已检测到 RTX 3060 Laptop GPU）
- **NVIDIA 驱动**: 已安装（版本 576.52，支持 CUDA 12.9）
- **Python**: 3.9（已安装）

## 📦 版本兼容性

| TensorFlow 版本 | CUDA 版本 | cuDNN 版本 | Python 版本 |
|----------------|-----------|------------|-------------|
| 2.10.1         | 11.2      | 8.1        | 3.7-3.10    |

## 🔧 安装步骤

### 第一步：安装 CUDA 11.2

#### 1. 下载 CUDA 11.2

- **下载页面**: https://developer.nvidia.com/cuda-11.2.0-download-archive
- **选择配置**:
  - Operating System: **Windows**
  - Architecture: **x86_64**
  - Version: **10/11**
  - Installer Type: **exe (local)** [推荐，约 3GB]

#### 2. 安装 CUDA 11.2

1. 运行下载的安装程序（例如：`cuda_11.2.0_460.89_windows.exe`）
2. 选择 **"Express"** 安装（推荐）或 **"Custom"**
3. 等待安装完成（可能需要 10-30 分钟）
4. **⚠️ 重要**: 安装完成后**必须重启计算机**

#### 3. 验证 CUDA 安装

重启后，打开新的命令提示符或 PowerShell，运行：

```bash
nvcc --version
```

应该显示类似以下内容：

```
nvcc: NVIDIA (R) Cuda compiler driver
Copyright (c) 2005-2021 NVIDIA Corporation
Built on ...
Cuda compilation tools, release 11.2, V11.2.xxx
```

### 第二步：安装 cuDNN 8.1

#### 1. 下载 cuDNN 8.1

- **下载页面**: https://developer.nvidia.com/rdp/cudnn-archive
- **需要**: 注册 NVIDIA 开发者账号（免费）
- **下载**: **cuDNN v8.1.1 for CUDA 11.2**
- **选择**: **Windows x64** 版本（zip 文件）

#### 2. 安装 cuDNN

cuDNN 是一个压缩包，需要手动解压并复制文件：

1. **解压下载的 zip 文件**（例如：`cudnn-11.2-windows-x64-v8.1.1.33.zip`）

2. **打开解压后的文件夹**，应该看到以下目录结构：
   ```
   cuda/
   ├── bin/
   ├── include/
   └── lib/
   ```

3. **找到 CUDA 安装目录**（通常是）：
   ```
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2
   ```

4. **将 cuDNN 文件复制到 CUDA 目录**：
   - 复制 `cuda\bin\*` → `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\bin\`
   - 复制 `cuda\include\*` → `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\include\`
   - 复制 `cuda\lib\x64\*` → `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\lib\x64\`

   **注意**: 如果目标文件夹中已有同名文件，选择**覆盖**。

#### 3. 验证 cuDNN 安装

检查文件是否存在：

```bash
dir "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\bin\cudnn64_8.dll"
```

如果文件存在，说明安装成功。

### 第三步：配置环境变量

#### 方法一：使用自动配置脚本（推荐）

1. **以管理员身份运行 PowerShell**
2. 运行配置脚本：
   ```powershell
   cd d:\code\Image-verification\python-service\scripts
   .\setup_cuda_env.ps1
   ```
3. 按照提示完成配置

#### 方法二：手动配置

1. 右键 **"此电脑"** → **"属性"**
2. 点击 **"高级系统设置"**
3. 点击 **"环境变量"**
4. 在 **"系统变量"** 中找到 `Path`，点击 **"编辑"**
5. 点击 **"新建"**，逐个添加以下路径：

   ```
      
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\libnvvp
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\include
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\lib\x64
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\lib64
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\include
   ```

6. 点击 **"确定"** 保存所有更改

### 第四步：重启计算机

**⚠️ 重要**: 配置环境变量后**必须重启计算机**，否则 TensorFlow 无法检测到 GPU！

### 第五步：验证安装

重启后，运行以下命令验证：

#### 1. 验证 CUDA

```bash
nvcc --version
```

#### 2. 验证 TensorFlow GPU 支持

```bash
cd d:\code\Image-verification\python-service
py -3.9 -c "import tensorflow as tf; print('TensorFlow:', tf.__version__); print('GPU 设备:', tf.config.list_physical_devices('GPU'))"
```

#### 3. 运行 GPU 检查脚本

```bash
cd d:\code\Image-verification\python-service
py -3.9 scripts\check_gpu.py
```

如果看到类似以下输出，说明配置成功：

```
TensorFlow 版本: 2.10.1
GPU 设备: [PhysicalDevice(name='/physical_device:GPU:0', device_type='GPU')]
```

## 🐛 常见问题

### Q1: 安装 CUDA 后 `nvcc` 命令不可用

**原因**: 环境变量未配置或未重启

**解决方案**:
1. 检查 PATH 环境变量是否包含 CUDA bin 目录
2. 重启计算机
3. 打开**新的**命令提示符窗口（不是已打开的窗口）

### Q2: TensorFlow 无法检测到 GPU

**检查清单**:
- ✅ CUDA 11.2 已安装
- ✅ cuDNN 8.1 已安装
- ✅ 环境变量已配置
- ✅ **已重启计算机**（重要！）
- ✅ NVIDIA 驱动程序是最新版本
- ✅ Python 是 64 位版本

### Q3: 提示 "Could not load dynamic library 'cudart64_110.dll'"

**原因**: CUDA 未正确安装或环境变量未配置

**解决方案**:
1. 确认 CUDA 11.2 已安装
2. 确认环境变量已配置
3. 重启计算机

### Q4: 提示 "Could not load dynamic library 'cudnn64_8.dll'"

**原因**: cuDNN 未正确安装

**解决方案**:
1. 确认 cuDNN 文件已复制到 CUDA 目录
2. 检查文件路径是否正确
3. 重启计算机

### Q5: 系统已安装其他版本的 CUDA

如果系统已安装其他版本的 CUDA（如 CUDA 12.9），可以同时安装多个版本。TensorFlow 2.10.1 会自动使用 CUDA 11.2（如果已正确配置）。

## 📚 参考链接

- [TensorFlow GPU 支持](https://www.tensorflow.org/install/gpu)
- [CUDA 11.2 下载](https://developer.nvidia.com/cuda-11.2.0-download-archive)
- [cuDNN 下载](https://developer.nvidia.com/rdp/cudnn-archive)
- [CUDA 工具包文档](https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/index.html)

## ✅ 安装完成检查清单

- [ ] CUDA 11.2 已安装
- [ ] cuDNN 8.1 已安装
- [ ] 环境变量已配置
- [ ] 已重启计算机
- [ ] `nvcc --version` 命令可用
- [ ] TensorFlow 可以检测到 GPU
- [ ] GPU 检查脚本运行正常

## 🚀 快速安装命令总结

```bash
# 1. 下载并安装 CUDA 11.2（手动）
# 访问: https://developer.nvidia.com/cuda-11.2.0-download-archive

# 2. 下载并安装 cuDNN 8.1（手动）
# 访问: https://developer.nvidia.com/rdp/cudnn-archive

# 3. 配置环境变量（以管理员身份运行）
cd d:\code\Image-verification\python-service\scripts
.\setup_cuda_env.ps1

# 4. 重启计算机

# 5. 验证安装
nvcc --version
py -3.9 -c "import tensorflow as tf; print('GPU:', tf.config.list_physical_devices('GPU'))"
```

---

**注意**: CUDA 和 cuDNN 需要手动下载和安装，无法通过 pip 安装。
