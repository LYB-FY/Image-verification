#!/usr/bin/env python
"""
测试批量并行处理所有图片接口（每个线程处理100张图片）
"""
import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"


def print_section(title):
    """打印分节标题"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_result(data, show_failed_ids=False):
    """打印处理结果"""
    print(f"\n处理结果:")
    print(f"  总图片数: {data.get('total', 0):,}")
    print(f"  已处理: {data.get('processed', 0):,}")
    print(f"  成功: {data.get('success', 0):,}")
    print(f"  失败: {data.get('failed', 0):,}")
    print(f"  跳过: {data.get('skipped', 0):,}")
    print(f"  消息: {data.get('message', '')}")
    
    if show_failed_ids and data.get('failed_ids'):
        failed_ids = data.get('failed_ids', [])
        print(f"  失败ID数量: {len(failed_ids)}")
        if len(failed_ids) <= 10:
            print(f"  失败ID: {failed_ids}")
        else:
            print(f"  失败ID（前10个）: {failed_ids[:10]}...")


def test_parallel_batch_basic():
    """测试基本批量并行处理（小批量）"""
    print_section("测试1: 基本批量并行处理（前200张图片，每个线程100张）")
    
    payload = {
        "limit": 200,
        "skip_processed": True,
        "force_reprocess": False,
        "max_workers": 2,
        "batch_size_per_thread": 100
    }
    
    print(f"请求参数: {json.dumps(payload, indent=2, ensure_ascii=False)}")
    print("\n开始处理...")
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{BASE_URL}/process/all/parallel-batch",
            json=payload,
            timeout=600  # 10分钟超时
        )
        elapsed_time = time.time() - start_time
        
        print(f"\n状态码: {response.status_code}")
        print(f"处理耗时: {elapsed_time:.2f} 秒")
        
        if response.status_code == 200:
            data = response.json()
            print_result(data)
            
            if data.get('processed', 0) > 0:
                speed = data.get('processed', 0) / elapsed_time if elapsed_time > 0 else 0
                print(f"\n处理速度: {speed:.2f} 张/秒")
        else:
            print(f"错误: {response.text}")
    except Exception as e:
        print(f"请求失败: {e}")
        import traceback
        traceback.print_exc()


def test_parallel_batch_different_workers():
    """测试不同线程数的性能对比"""
    print_section("测试2: 不同线程数性能对比（前500张图片，每个线程100张）")
    
    test_cases = [
        {"max_workers": 2, "name": "2线程"},
        {"max_workers": 4, "name": "4线程"},
        {"max_workers": 8, "name": "8线程"},
    ]
    
    results = []
    
    for test_case in test_cases:
        print(f"\n--- 测试 {test_case['name']} ---")
        payload = {
            "limit": 500,
            "skip_processed": True,
            "force_reprocess": False,
            "max_workers": test_case['max_workers'],
            "batch_size_per_thread": 100
        }
        
        start_time = time.time()
        try:
            response = requests.post(
                f"{BASE_URL}/process/all/parallel-batch",
                json=payload,
                timeout=1200  # 20分钟超时
            )
            elapsed_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                processed = data.get('processed', 0)
                success = data.get('success', 0)
                speed = processed / elapsed_time if elapsed_time > 0 else 0
                
                result = {
                    'workers': test_case['max_workers'],
                    'time': elapsed_time,
                    'processed': processed,
                    'success': success,
                    'speed': speed
                }
                results.append(result)
                
                print(f"  耗时: {elapsed_time:.2f} 秒")
                print(f"  处理: {processed} 张")
                print(f"  成功: {success} 张")
                print(f"  速度: {speed:.2f} 张/秒")
            else:
                print(f"  错误: {response.status_code}")
        except Exception as e:
            print(f"  请求失败: {e}")
        
        # 等待一下，避免请求过快
        time.sleep(2)
    
    # 打印对比结果
    if results:
        print("\n" + "-" * 70)
        print("性能对比:")
        print(f"{'线程数':<10} {'耗时(秒)':<12} {'处理数':<10} {'成功数':<10} {'速度(张/秒)':<15}")
        print("-" * 70)
        for r in results:
            print(f"{r['workers']:<10} {r['time']:<12.2f} {r['processed']:<10} {r['success']:<10} {r['speed']:<15.2f}")
        
        # 找出最快的
        fastest = max(results, key=lambda x: x['speed'])
        print(f"\n最快配置: {fastest['workers']} 线程 ({fastest['speed']:.2f} 张/秒)")


def test_parallel_batch_vs_parallel():
    """对比批量并行处理和单张并行处理的性能"""
    print_section("测试3: 批量并行处理 vs 单张并行处理性能对比（前300张图片）")
    
    test_limit = 300
    
    # 测试单张并行处理
    print("\n--- 单张并行处理（每个线程1张）---")
    single_payload = {
        "limit": test_limit,
        "skip_processed": True,
        "force_reprocess": False,
        "max_workers": 4
    }
    
    single_start = time.time()
    try:
        single_response = requests.post(
            f"{BASE_URL}/process/all/parallel",
            json=single_payload,
            timeout=1200
        )
        single_time = time.time() - single_start
        
        if single_response.status_code == 200:
            single_data = single_response.json()
            single_processed = single_data.get('processed', 0)
            single_speed = single_processed / single_time if single_time > 0 else 0
            print(f"  耗时: {single_time:.2f} 秒")
            print(f"  处理: {single_processed} 张")
            print(f"  速度: {single_speed:.2f} 张/秒")
        else:
            print(f"  错误: {single_response.status_code}")
            single_time = 0
            single_speed = 0
    except Exception as e:
        print(f"  请求失败: {e}")
        single_time = 0
        single_speed = 0
    
    time.sleep(2)
    
    # 测试批量并行处理
    print("\n--- 批量并行处理（每个线程100张）---")
    batch_payload = {
        "limit": test_limit,
        "skip_processed": True,
        "force_reprocess": False,
        "max_workers": 4,
        "batch_size_per_thread": 100
    }
    
    batch_start = time.time()
    try:
        batch_response = requests.post(
            f"{BASE_URL}/process/all/parallel-batch",
            json=batch_payload,
            timeout=1200
        )
        batch_time = time.time() - batch_start
        
        if batch_response.status_code == 200:
            batch_data = batch_response.json()
            batch_processed = batch_data.get('processed', 0)
            batch_speed = batch_processed / batch_time if batch_time > 0 else 0
            print(f"  耗时: {batch_time:.2f} 秒")
            print(f"  处理: {batch_processed} 张")
            print(f"  速度: {batch_speed:.2f} 张/秒")
        else:
            print(f"  错误: {batch_response.status_code}")
            batch_time = 0
            batch_speed = 0
    except Exception as e:
        print(f"  请求失败: {e}")
        batch_time = 0
        batch_speed = 0
    
    # 对比结果
    if single_time > 0 and batch_time > 0:
        speedup = single_time / batch_time
        print("\n" + "-" * 70)
        print("性能对比:")
        print(f"  单张并行处理: {single_time:.2f} 秒 ({single_speed:.2f} 张/秒)")
        print(f"  批量并行处理: {batch_time:.2f} 秒 ({batch_speed:.2f} 张/秒)")
        print(f"  加速比: {speedup:.2f}x")
        if speedup > 1:
            print(f"  ✓ 批量并行处理快 {speedup:.2f} 倍")
        else:
            print(f"  ⚠ 批量并行处理未显示优势")


def test_parallel_batch_custom_batch_size():
    """测试不同批次大小的性能"""
    print_section("测试4: 不同批次大小性能对比（前400张图片，4线程）")
    
    test_cases = [
        {"batch_size": 50, "name": "每线程50张"},
        {"batch_size": 100, "name": "每线程100张"},
        {"batch_size": 200, "name": "每线程200张"},
    ]
    
    results = []
    
    for test_case in test_cases:
        print(f"\n--- 测试 {test_case['name']} ---")
        payload = {
            "limit": 400,
            "skip_processed": True,
            "force_reprocess": False,
            "max_workers": 4,
            "batch_size_per_thread": test_case['batch_size']
        }
        
        start_time = time.time()
        try:
            response = requests.post(
                f"{BASE_URL}/process/all/parallel-batch",
                json=payload,
                timeout=1200
            )
            elapsed_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                processed = data.get('processed', 0)
                success = data.get('success', 0)
                speed = processed / elapsed_time if elapsed_time > 0 else 0
                
                result = {
                    'batch_size': test_case['batch_size'],
                    'time': elapsed_time,
                    'processed': processed,
                    'success': success,
                    'speed': speed
                }
                results.append(result)
                
                print(f"  耗时: {elapsed_time:.2f} 秒")
                print(f"  处理: {processed} 张")
                print(f"  成功: {success} 张")
                print(f"  速度: {speed:.2f} 张/秒")
            else:
                print(f"  错误: {response.status_code}")
        except Exception as e:
            print(f"  请求失败: {e}")
        
        # 等待一下，避免请求过快
        time.sleep(2)
    
    # 打印对比结果
    if results:
        print("\n" + "-" * 70)
        print("性能对比:")
        print(f"{'批次大小':<12} {'耗时(秒)':<12} {'处理数':<10} {'成功数':<10} {'速度(张/秒)':<15}")
        print("-" * 70)
        for r in results:
            print(f"{r['batch_size']:<12} {r['time']:<12.2f} {r['processed']:<10} {r['success']:<10} {r['speed']:<15.2f}")
        
        # 找出最快的
        fastest = max(results, key=lambda x: x['speed'])
        print(f"\n最快配置: 每线程 {fastest['batch_size']} 张 ({fastest['speed']:.2f} 张/秒)")


def test_parallel_batch_large():
    """测试大批量处理"""
    print_section("测试5: 大批量并行处理")
    
    print("\n警告: 这将处理大量图片，可能需要很长时间！")
    print("请输入要处理的图片数量（直接回车跳过此测试）: ", end="")
    
    try:
        user_input = input().strip()
        if not user_input:
            print("已跳过")
            return
        
        limit = int(user_input)
        if limit <= 0:
            print("无效的数量")
            return
        
        print(f"\n将处理前 {limit} 张图片")
        print("配置: 4线程，每个线程100张")
        print("按 Ctrl+C 取消，或等待5秒后继续...")
        time.sleep(5)
        
        payload = {
            "limit": limit,
            "skip_processed": True,
            "force_reprocess": False,
            "max_workers": 20,
            "batch_size_per_thread": 100
        }
        
        print("\n开始处理...")
        start_time = time.time()
        
        response = requests.post(
            f"{BASE_URL}/process/all/parallel-batch",
            json=payload,
            timeout=7200  # 2小时超时
        )
        elapsed_time = time.time() - start_time
        
        print(f"\n状态码: {response.status_code}")
        print(f"处理耗时: {elapsed_time:.2f} 秒 ({elapsed_time/60:.2f} 分钟)")
        
        if response.status_code == 200:
            data = response.json()
            print_result(data, show_failed_ids=False)
            
            if data.get('processed', 0) > 0:
                speed = data.get('processed', 0) / elapsed_time if elapsed_time > 0 else 0
                print(f"\n处理速度: {speed:.2f} 张/秒")
                if data.get('total', 0) > 0:
                    print(f"预计处理全部图片需要: {data.get('total', 0) / speed / 3600:.2f} 小时")
        else:
            print(f"错误: {response.text}")
            
    except KeyboardInterrupt:
        print("\n已取消")
    except ValueError:
        print("无效的输入")
    except Exception as e:
        print(f"请求失败: {e}")


def main():
    """主函数"""
    print("\n" + "=" * 70)
    print("  批量并行处理接口测试脚本（每个线程处理100张图片）")
    print("=" * 70)
    print(f"\n服务地址: {BASE_URL}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 检查服务是否可用
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print("\n⚠ 警告: 服务健康检查失败")
    except Exception as e:
        print(f"\n❌ 错误: 无法连接到服务 ({e})")
        print("提示: 请确保服务正在运行 (python run.py)")
        return
    
    import sys
    
    if len(sys.argv) > 1:
        test_name = sys.argv[1].lower()
        
        if test_name == "basic":
            test_parallel_batch_basic()
        elif test_name == "workers":
            test_parallel_batch_different_workers()
        elif test_name == "compare":
            test_parallel_batch_vs_parallel()
        elif test_name == "batch":
            test_parallel_batch_custom_batch_size()
        elif test_name == "large":
            test_parallel_batch_large()
        elif test_name == "all":
            test_parallel_batch_basic()
            test_parallel_batch_different_workers()
            test_parallel_batch_vs_parallel()
            test_parallel_batch_custom_batch_size()
        else:
            print(f"未知的测试: {test_name}")
            print_usage()
    else:
        # 默认运行基本测试
        test_parallel_batch_basic()
        test_parallel_batch_vs_parallel()
        
        print("\n" + "=" * 70)
        print("提示: 运行更多测试")
        print("=" * 70)
        print("  python scripts/test_process_all_parallel_batch.py basic    - 基本测试")
        print("  python scripts/test_process_all_parallel_batch.py workers - 不同线程数对比")
        print("  python scripts/test_process_all_parallel_batch.py compare - 批量vs单张对比")
        print("  python scripts/test_process_all_parallel_batch.py batch   - 不同批次大小对比")
        print("  python scripts/test_process_all_parallel_batch.py large    - 大批量处理测试")
        print("  python scripts/test_process_all_parallel_batch.py all      - 运行所有测试")
        print("=" * 70)


def print_usage():
    """打印使用说明"""
    print("\n使用方法:")
    print("  python scripts/test_process_all_parallel_batch.py [test_name]")
    print("\n可用的测试:")
    print("  basic    - 基本批量并行处理测试")
    print("  workers  - 不同线程数性能对比")
    print("  compare  - 批量并行vs单张并行性能对比")
    print("  batch    - 不同批次大小性能对比")
    print("  large    - 大批量处理测试")
    print("  all      - 运行所有测试")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
    except Exception as e:
        print(f"\n\n发生错误: {e}")
        import traceback
        traceback.print_exc()
