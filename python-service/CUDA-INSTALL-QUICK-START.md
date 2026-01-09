# CUDA 11.2 快速安装指南

## 📋 当前状态

- ✅ **NVIDIA 驱动**: 已安装（版本 576.52，支持 CUDA 12.9）
- ✅ **GPU**: NVIDIA GeForce RTX 3060（6GB 显存）
- ❌ **CUDA Toolkit**: 未安装（需要安装 CUDA 11.2）

## 🚀 快速安装步骤

### 第一步：下载 CUDA 11.2

1. **访问下载页面**（已自动打开）：
   - https://developer.nvidia.com/cuda-11.2.0-download-archive

2. **选择以下配置**：
   - Operating System: **Windows**
   - Architecture: **x86_64**
   - Version: **10/11**
   - Installer Type: **exe (local)** [推荐，约 3GB]

3. **点击下载**，等待下载完成（约 3GB，可能需要一些时间）

### 第二步：安装 CUDA 11.2

1. **运行下载的安装程序**（例如：`cuda_11.2.0_460.89_windows.exe`）

2. **选择安装类型**：
   - 推荐选择 **"Express"** 安装（默认选项）
   - 这会安装所有必要的组件

3. **等待安装完成**（可能需要 10-30 分钟）

4. **⚠️ 重要**：安装完成后**必须重启计算机**

### 第三步：验证安装

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

### 第四步：配置环境变量（如果需要）

如果 `nvcc` 命令仍然不可用，需要手动配置环境变量：

1. 右键 **"此电脑"** → **"属性"**
2. 点击 **"高级系统设置"**
3. 点击 **"环境变量"**
4. 在 **"系统变量"** 中找到 `Path`，点击 **"编辑"**
5. 点击 **"新建"**，添加以下路径：

```
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\bin
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\libnvvp
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\include
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\lib\x64
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\lib64
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\include
```

6. 点击 **"确定"** 保存所有更改
7. **再次重启计算机**

### 第五步：验证 TensorFlow GPU 支持

安装 CUDA 后，还需要安装 cuDNN 8.1 才能使用 TensorFlow GPU。请参考：
- `CUDA-CUDNN-INSTALL-GUIDE.md` - 完整的 CUDA 和 cuDNN 安装指南

快速验证命令：

```bash
cd python-service
py -3.9 -c "import tensorflow as tf; print('TensorFlow:', tf.__version__); print('GPU 设备:', tf.config.list_physical_devices('GPU'))"
```

## 📝 注意事项

1. **多个 CUDA 版本**：可以同时安装多个 CUDA 版本（如 CUDA 11.2 和 CUDA 12.9），TensorFlow 会自动使用兼容的版本。

2. **必须重启**：安装 CUDA 后必须重启计算机，否则无法使用。

3. **环境变量**：如果使用 "Express" 安装，环境变量通常会自动配置。如果未自动配置，请手动添加。

4. **文件大小**：CUDA 11.2 安装程序约 3GB，请确保有足够的磁盘空间。

## 🔧 使用安装脚本

也可以使用项目提供的安装脚本：

```bash
cd python-service\scripts
.\install_cuda.bat
```

这个脚本会：
- 检查 CUDA 安装状态
- 打开下载页面
- 显示详细的安装步骤

## ❓ 常见问题

### Q: 安装后 `nvcc` 命令仍然不可用？

**A:** 
1. 确认已重启计算机
2. 检查环境变量是否已配置
3. 打开**新的**命令提示符窗口（不是已打开的窗口）

### Q: 系统已安装 CUDA 12.9，还需要安装 11.2 吗？

**A:** 是的，TensorFlow 2.10.1 需要 CUDA 11.2。可以同时安装多个版本，它们不会冲突。

### Q: 安装需要多长时间？

**A:** 
- 下载：取决于网络速度（约 3GB）
- 安装：10-30 分钟
- 重启：几分钟

## 📚 相关文档

- `CUDA-CUDNN-INSTALL-GUIDE.md` - 完整的 CUDA 和 cuDNN 安装指南
- `TENSORFLOW-2.10-GPU-INSTALL.md` - TensorFlow GPU 完整安装指南

---

**提示**：安装完成后，记得安装 cuDNN 8.1 才能完整支持 TensorFlow GPU！
