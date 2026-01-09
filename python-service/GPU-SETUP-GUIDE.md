# Windows GPU 配置指南

## 当前状态

- ✅ **GPU硬件**: 检测到 NVIDIA GeForce RTX 3060 Laptop GPU (6GB显存)
- ❌ **TensorFlow GPU支持**: 未启用（当前为CPU版本）

## 问题说明

从 TensorFlow 2.11 开始，官方不再直接支持在 Windows 上使用 GPU。要在 Windows 上使用 GPU，有以下几种解决方案：

## 解决方案

### 方案一：安装 CUDA 工具包（推荐）

这是最直接的方法，但需要手动安装 CUDA 工具包。

#### 步骤 1: 安装 CUDA 工具包

TensorFlow 2.15.0 需要 **CUDA 11.8** 和 **cuDNN 8.6**

1. **下载 CUDA 11.8**
   - 访问: https://developer.nvidia.com/cuda-11-8-0-download-archive
   - 选择 Windows → x86_64 → 10/11 → exe (local)
   - 下载并运行安装程序

2. **下载 cuDNN 8.6**
   - 访问: https://developer.nvidia.com/rdp/cudnn-archive
   - 需要注册 NVIDIA 开发者账号（免费）
   - 下载 cuDNN 8.6 for CUDA 11.x
   - 解压后，将文件复制到 CUDA 安装目录

3. **配置环境变量**
   
   将以下路径添加到系统 PATH 环境变量：
   ```
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\libnvvp
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\include
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\lib\x64
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\extras\CUPTI\lib64
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\extras\CUPTI\include
   ```

4. **验证安装**
   ```bash
   nvcc --version
   ```

5. **重启计算机**（重要！）

6. **验证 TensorFlow GPU**
   ```bash
   python scripts/check_gpu.py
   ```

### 方案二：使用 WSL2（适用于 Linux 的 Windows 子系统）

WSL2 允许在 Windows 上运行 Linux 环境，从而可以使用完整的 GPU 支持。

#### 步骤：

1. **安装 WSL2**
   ```powershell
   wsl --install
   ```

2. **在 WSL2 中安装 CUDA**
   - 参考: https://docs.nvidia.com/cuda/wsl-user-guide/index.html

3. **在 WSL2 中安装 TensorFlow**
   ```bash
   pip install tensorflow[and-cuda]==2.15.0
   ```

### 方案三：使用 Docker（高级）

使用 NVIDIA 提供的 Docker 容器运行 TensorFlow，无需在主机上安装 CUDA。

## 快速检查

运行以下命令检查 GPU 状态：

```bash
python scripts/check_gpu.py
```

## 验证 GPU 是否可用

安装完成后，运行以下 Python 代码验证：

```python
import tensorflow as tf

print("TensorFlow 版本:", tf.__version__)
print("GPU 设备数量:", len(tf.config.list_physical_devices('GPU')))
print("GPU 设备:", tf.config.list_physical_devices('GPU'))
```

如果输出显示 GPU 设备数量 > 0，说明配置成功！

## 常见问题

### Q: 为什么 TensorFlow 2.15 在 Windows 上不支持 GPU？

A: 从 TensorFlow 2.11 开始，官方不再维护 Windows 上的 GPU 支持，因为维护成本高且使用率低。建议使用 WSL2 或安装 CUDA 工具包。

### Q: 安装 CUDA 后仍然无法使用 GPU？

A: 请确保：
1. 已重启计算机
2. 环境变量已正确配置
3. CUDA 和 cuDNN 版本与 TensorFlow 版本兼容
4. NVIDIA 驱动程序是最新版本

### Q: 可以使用 TensorFlow 2.10 吗？

A: TensorFlow 2.10 是最后一个在 Windows 上支持 GPU 的版本，但它不支持 Python 3.11。如果使用 Python 3.10，可以安装 TensorFlow 2.10。

## 参考链接

- [TensorFlow GPU 支持](https://www.tensorflow.org/install/gpu)
- [CUDA 下载](https://developer.nvidia.com/cuda-downloads)
- [cuDNN 下载](https://developer.nvidia.com/rdp/cudnn-download)
- [WSL2 GPU 支持](https://docs.nvidia.com/cuda/wsl-user-guide/index.html)
