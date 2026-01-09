"""
检查本机可用的GPU设备
支持TensorFlow和nvidia-smi
"""
import sys
import subprocess
import json
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import tensorflow as tf
import numpy as np


def check_nvidia_smi():
    """使用nvidia-smi检查GPU信息"""
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=index,name,memory.total,memory.used,memory.free,driver_version,compute_cap', '--format=csv,noheader,nounits'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except FileNotFoundError:
        return None
    except subprocess.CalledProcessError as e:
        print(f"nvidia-smi执行失败: {e}")
        return None


def check_tensorflow_gpu():
    """检查TensorFlow检测到的GPU"""
    print("=" * 60)
    print("TensorFlow GPU 检测")
    print("=" * 60)
    
    # TensorFlow版本
    print(f"\nTensorFlow 版本: {tf.__version__}")
    
    # 列出所有物理设备
    print("\n所有物理设备:")
    physical_devices = tf.config.list_physical_devices()
    for i, device in enumerate(physical_devices):
        print(f"  [{i}] {device}")
    
    # 列出GPU设备
    print("\nGPU 设备:")
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"  [OK] 检测到 {len(gpus)} 个GPU设备:")
        for i, gpu in enumerate(gpus):
            print(f"    GPU {i}: {gpu}")
            
            # 获取GPU详细信息
            try:
                gpu_details = tf.config.experimental.get_device_details(gpu)
                if gpu_details:
                    print(f"      详细信息: {json.dumps(gpu_details, indent=8, ensure_ascii=False)}")
            except Exception as e:
                print(f"      无法获取详细信息: {e}")
            
            # 获取GPU内存信息
            try:
                memory_info = tf.config.experimental.get_memory_info(gpu)
                if memory_info:
                    print(f"      内存信息:")
                    print(f"        当前分配: {memory_info['current'] / 1024**3:.2f} GB")
                    print(f"        峰值分配: {memory_info['peak'] / 1024**3:.2f} GB")
            except Exception as e:
                print(f"      无法获取内存信息: {e}")
    else:
        print("  [X] 未检测到GPU设备")
    
    # 检查CUDA是否可用
    print("\nCUDA 信息:")
    try:
        cuda_available = tf.test.is_built_with_cuda()
        print(f"  TensorFlow是否使用CUDA构建: {cuda_available}")
        
        if cuda_available:
            try:
                cuda_version = tf.sysconfig.get_build_info()['cuda_version']
                cudnn_version = tf.sysconfig.get_build_info()['cudnn_version']
                print(f"  CUDA 版本: {cuda_version}")
                print(f"  cuDNN 版本: {cudnn_version}")
            except Exception as e:
                print(f"  无法获取CUDA版本信息: {e}")
        else:
            print("  [WARNING] TensorFlow是CPU版本，不支持GPU加速")
    except Exception as e:
        print(f"  无法检查CUDA信息: {e}")
    
    return gpus


def test_gpu_performance():
    """测试GPU性能（如果可用）"""
    gpus = tf.config.list_physical_devices('GPU')
    if not gpus:
        print("\n未检测到GPU，跳过性能测试")
        return
    
    print("\n" + "=" * 60)
    print("GPU 性能测试")
    print("=" * 60)
    
    try:
        # 配置GPU内存增长
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        
        # 创建测试数据
        print("\n创建测试数据...")
        test_data = tf.random.normal((100, 224, 224, 3))
        
        # 测试CPU性能
        print("测试CPU性能...")
        with tf.device('/CPU:0'):
            import time
            start = time.time()
            result_cpu = tf.reduce_sum(test_data)
            cpu_time = time.time() - start
            print(f"  CPU计算时间: {cpu_time:.4f} 秒")
        
        # 测试GPU性能
        print("测试GPU性能...")
        with tf.device('/GPU:0'):
            start = time.time()
            result_gpu = tf.reduce_sum(test_data)
            gpu_time = time.time() - start
            print(f"  GPU计算时间: {gpu_time:.4f} 秒")
        
        if gpu_time > 0:
            speedup = cpu_time / gpu_time
            print(f"\nGPU加速比: {speedup:.2f}x")
        
    except Exception as e:
        print(f"性能测试失败: {e}")


def print_recommendations(has_nvidia_smi, has_tensorflow_gpu):
    """打印建议"""
    print("\n" + "=" * 60)
    print("建议和说明")
    print("=" * 60)
    
    if has_nvidia_smi and not has_tensorflow_gpu:
        print("\n[WARNING] 检测到GPU硬件，但TensorFlow无法使用GPU")
        print("\n可能的原因和解决方案:")
        print("1. TensorFlow是CPU版本")
        print("   解决方案: 卸载CPU版本，安装GPU版本")
        print("   pip uninstall tensorflow")
        print("   pip install tensorflow[and-cuda]")
        print("   或者: pip install tensorflow-gpu")
        print("\n2. CUDA/cuDNN未正确安装")
        print("   解决方案: 安装与TensorFlow版本兼容的CUDA和cuDNN")
        print("   TensorFlow 2.15.0 需要 CUDA 11.8 和 cuDNN 8.6")
        print("\n3. 环境变量未设置")
        print("   解决方案: 确保CUDA路径在系统PATH中")
    elif not has_nvidia_smi and not has_tensorflow_gpu:
        print("\n[WARNING] 未检测到GPU硬件")
        print("   如果您的系统有NVIDIA GPU，请:")
        print("   1. 安装NVIDIA驱动程序")
        print("   2. 确保GPU已正确连接")
        print("   3. 运行 nvidia-smi 命令验证")
    elif has_nvidia_smi and has_tensorflow_gpu:
        print("\n[OK] GPU配置正常，TensorFlow可以使用GPU加速")


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("GPU 设备检查工具")
    print("=" * 60)
    
    # 检查nvidia-smi
    print("\n" + "=" * 60)
    print("nvidia-smi 信息")
    print("=" * 60)
    nvidia_smi_output = check_nvidia_smi()
    has_nvidia_smi = False
    if nvidia_smi_output:
        has_nvidia_smi = True
        print("\nnvidia-smi 输出:")
        lines = nvidia_smi_output.split('\n')
        headers = ["索引", "名称", "总内存(MB)", "已用内存(MB)", "空闲内存(MB)", "驱动版本", "计算能力"]
        print(" | ".join(headers))
        print("-" * 100)
        for line in lines:
            if line.strip():
                parts = [p.strip() for p in line.split(',')]
                print(" | ".join(parts))
    else:
        print("\nnvidia-smi 不可用（可能未安装NVIDIA驱动或不在PATH中）")
    
    # 检查TensorFlow GPU
    gpus = check_tensorflow_gpu()
    has_tensorflow_gpu = len(gpus) > 0
    
    # 性能测试
    if gpus:
        test_gpu_performance()
    
    # 打印建议
    print_recommendations(has_nvidia_smi, has_tensorflow_gpu)
    
    print("\n" + "=" * 60)
    print("检查完成")
    print("=" * 60)


if __name__ == "__main__":
    main()
