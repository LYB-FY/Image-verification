# TensorFlow 2.10 GPU 安装总结

## ✅ 已完成

1. ✅ Python 3.8 (64位) 已安装并验证
2. ✅ pip 已升级到最新版本
3. ✅ pip 配置文件已设置（使用清华镜像源）

## ⚠️ 当前问题

**pip 代理配置问题**：pip 仍然尝试使用某个代理服务器，但代理不可用。这可能是系统级别的配置。

## 🔧 解决方案

### 方案一：手动下载安装（推荐）

由于代理问题，建议手动下载 TensorFlow wheel 文件安装：

#### 1. 下载 TensorFlow 2.10.0

**Windows 64位 Python 3.8 wheel 文件：**
- 直接下载链接：https://files.pythonhosted.org/packages/py3/t/tensorflow/tensorflow-2.10.0-cp38-cp38-win_amd64.whl
- 或者访问：https://pypi.org/project/tensorflow/2.10.0/#files
- 选择：`tensorflow-2.10.0-cp38-cp38-win_amd64.whl`

#### 2. 安装下载的文件

将下载的 `.whl` 文件放到项目目录，然后运行：

```bash
cd python-service
py -3.8 -m pip install tensorflow-2.10.0-cp38-cp38-win_amd64.whl
```

#### 3. 安装依赖包

TensorFlow 2.10.0 需要一些依赖，可能需要单独安装：

```bash
py -3.8 -m pip install numpy<1.24 protobuf<4 h5py<3.1.0
```

### 方案二：使用 conda（如果已安装）

如果您安装了 Anaconda 或 Miniconda：

```bash
# 创建新环境（可选）
conda create -n tf210 python=3.8
conda activate tf210

# 安装 TensorFlow 2.10
conda install -c conda-forge tensorflow=2.10.0
```

### 方案三：修复系统代理设置

1. **检查 Windows 系统代理设置**
   - 打开"设置" → "网络和Internet" → "代理"
   - 检查"使用代理服务器"是否开启
   - 如果不需要，关闭代理

2. **检查注册表代理设置**
   - 按 `Win + R`，输入 `regedit`
   - 导航到：`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Internet Settings`
   - 检查 `ProxyEnable` 和 `ProxyServer` 的值
   - 如果不需要代理，将 `ProxyEnable` 设置为 `0`

3. **重启计算机**后重试安装

## 📦 安装 CUDA 11.2 和 cuDNN 8.1

安装完 TensorFlow 后，需要安装 CUDA 和 cuDNN 才能使用 GPU：

### 1. 下载 CUDA 11.2

- 访问：https://developer.nvidia.com/cuda-11.2.0-download-archive
- 选择：
  - Operating System: **Windows**
  - Architecture: **x86_64**
  - Version: **10/11**
  - Installer Type: **exe (local)**
- 下载并运行安装程序
- **重要**：安装完成后重启计算机

### 2. 下载 cuDNN 8.1

- 访问：https://developer.nvidia.com/rdp/cudnn-archive
- 需要注册 NVIDIA 开发者账号（免费）
- 下载：**cuDNN v8.1.1 for CUDA 11.2**
- 选择：**Windows x64** 版本

### 3. 安装 cuDNN

cuDNN 是压缩包，需要手动解压并复制：

1. 解压下载的 zip 文件
2. 找到 CUDA 安装目录（通常是）：
   ```
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2
   ```
3. 复制文件：
   - `bin\*` → `CUDA\v11.2\bin\`
   - `include\*` → `CUDA\v11.2\include\`
   - `lib\x64\*` → `CUDA\v11.2\lib\x64\`

### 4. 配置环境变量

1. 右键"此电脑" → "属性" → "高级系统设置" → "环境变量"
2. 在"系统变量"的 `Path` 中添加：
   ```
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\bin
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\libnvvp
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\include
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\lib\x64
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\lib64
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.2\extras\CUPTI\include
   ```
3. **重启计算机**

## ✅ 验证安装

### 1. 验证 TensorFlow

```bash
py -3.8 -c "import tensorflow as tf; print('TensorFlow版本:', tf.__version__)"
```

应该显示：`TensorFlow版本: 2.10.0`

### 2. 验证 CUDA

```bash
nvcc --version
```

应该显示 CUDA 11.2 的版本信息。

### 3. 验证 GPU 支持

运行 GPU 检查脚本：

```bash
cd python-service
py -3.8 scripts/check_gpu.py
```

或者运行 Python 代码：

```python
import tensorflow as tf

print("TensorFlow 版本:", tf.__version__)
print("GPU 设备数量:", len(tf.config.list_physical_devices('GPU')))
print("GPU 设备:", tf.config.list_physical_devices('GPU'))

if tf.config.list_physical_devices('GPU'):
    print("\n✅ GPU 配置成功！")
    # 测试 GPU 计算
    with tf.device('/GPU:0'):
        a = tf.constant([[1.0, 2.0], [3.0, 4.0]])
        b = tf.constant([[1.0, 1.0], [0.0, 1.0]])
        c = tf.matmul(a, b)
        print("GPU 计算测试成功:", c.numpy())
else:
    print("\n❌ 未检测到 GPU，请检查 CUDA 和 cuDNN 安装")
```

## 📝 安装顺序总结

1. ✅ Python 3.8 (64位) - **已完成**
2. ⏳ TensorFlow 2.10.0 - **需要手动安装**（由于代理问题）
3. ⏳ CUDA 11.2 - **待安装**
4. ⏳ cuDNN 8.1 - **待安装**
5. ⏳ 配置环境变量 - **待完成**
6. ⏳ 验证 GPU 支持 - **待验证**

## 🔗 参考链接

- [TensorFlow 2.10.0 下载](https://pypi.org/project/tensorflow/2.10.0/#files)
- [CUDA 11.2 下载](https://developer.nvidia.com/cuda-11.2.0-download-archive)
- [cuDNN 下载](https://developer.nvidia.com/rdp/cudnn-archive)
- [详细安装指南](./TENSORFLOW-2.10-GPU-INSTALL.md)

## 💡 提示

- 如果遇到问题，请参考 `TENSORFLOW-2.10-GPU-INSTALL.md` 获取详细说明
- 安装 CUDA 和 cuDNN 后必须重启计算机
- 确保 NVIDIA 驱动程序是最新版本
