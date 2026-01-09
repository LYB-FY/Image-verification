#!/usr/bin/env python
"""
测试并行处理所有图片接口
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


def test_parallel_basic():
    """测试基本并行处理（小批量）"""
    print_section("测试1: 基本并行处理（前20张图片）")
    
    payload = {
        "limit": 20,
        "skip_processed": True,
        "force_reprocess": False,
        "max_workers": 4
    }
    
    print(f"请求参数: {json.dumps(payload, indent=2, ensure_ascii=False)}")
    print("\n开始处理...")
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{BASE_URL}/process/all/parallel",
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


def test_parallel_different_workers():
    """测试不同线程数的性能对比"""
    print_section("测试2: 不同线程数性能对比（前50张图片）")
    
    test_cases = [
        {"max_workers": 2, "name": "2线程"},
        {"max_workers": 4, "name": "4线程"},
        {"max_workers": 8, "name": "8线程"},
    ]
    
    results = []
    
    for test_case in test_cases:
        print(f"\n--- 测试 {test_case['name']} ---")
        payload = {
            "limit": 50,
            "skip_processed": True,
            "force_reprocess": False,
            "max_workers": test_case['max_workers']
        }
        
        start_time = time.time()
        try:
            response = requests.post(
                f"{BASE_URL}/process/all/parallel",
                json=payload,
                timeout=600
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


def test_parallel_vs_serial():
    """对比并行处理和串行处理的性能"""
    print_section("测试3: 并行处理 vs 串行处理性能对比（前30张图片）")
    
    test_limit = 30
    
    # 测试串行处理
    print("\n--- 串行处理 ---")
    serial_payload = {
        "limit": test_limit,
        "skip_processed": True,
        "force_reprocess": False
    }
    
    serial_start = time.time()
    try:
        serial_response = requests.post(
            f"{BASE_URL}/process/all",
            json=serial_payload,
            timeout=600
        )
        serial_time = time.time() - serial_start
        
        if serial_response.status_code == 200:
            serial_data = serial_response.json()
            serial_processed = serial_data.get('processed', 0)
            serial_speed = serial_processed / serial_time if serial_time > 0 else 0
            print(f"  耗时: {serial_time:.2f} 秒")
            print(f"  处理: {serial_processed} 张")
            print(f"  速度: {serial_speed:.2f} 张/秒")
        else:
            print(f"  错误: {serial_response.status_code}")
            serial_time = 0
            serial_speed = 0
    except Exception as e:
        print(f"  请求失败: {e}")
        serial_time = 0
        serial_speed = 0
    
    time.sleep(2)
    
    # 测试并行处理
    print("\n--- 并行处理（4线程）---")
    parallel_payload = {
        "limit": test_limit,
        "skip_processed": True,
        "force_reprocess": False,
        "max_workers": 4
    }
    
    parallel_start = time.time()
    try:
        parallel_response = requests.post(
            f"{BASE_URL}/process/all/parallel",
            json=parallel_payload,
            timeout=600
        )
        parallel_time = time.time() - parallel_start
        
        if parallel_response.status_code == 200:
            parallel_data = parallel_response.json()
            parallel_processed = parallel_data.get('processed', 0)
            parallel_speed = parallel_processed / parallel_time if parallel_time > 0 else 0
            print(f"  耗时: {parallel_time:.2f} 秒")
            print(f"  处理: {parallel_processed} 张")
            print(f"  速度: {parallel_speed:.2f} 张/秒")
        else:
            print(f"  错误: {parallel_response.status_code}")
            parallel_time = 0
            parallel_speed = 0
    except Exception as e:
        print(f"  请求失败: {e}")
        parallel_time = 0
        parallel_speed = 0
    
    # 对比结果
    if serial_time > 0 and parallel_time > 0:
        speedup = serial_time / parallel_time
        print("\n" + "-" * 70)
        print("性能对比:")
        print(f"  串行处理: {serial_time:.2f} 秒 ({serial_speed:.2f} 张/秒)")
        print(f"  并行处理: {parallel_time:.2f} 秒 ({parallel_speed:.2f} 张/秒)")
        print(f"  加速比: {speedup:.2f}x")
        if speedup > 1:
            print(f"  ✓ 并行处理快 {speedup:.2f} 倍")
        else:
            print(f"  ⚠ 并行处理未显示优势（可能数据量太小）")


def test_parallel_custom_config():
    """测试自定义配置"""
    print_section("测试4: 自定义配置测试（前100张图片）")
    
    payload = {
        "limit": 100,
        "skip_processed": True,
        "force_reprocess": False,
        "max_workers": 6  # 自定义线程数
    }
    
    print(f"请求参数:")
    print(f"  最大线程数: {payload['max_workers']}")
    print(f"  限制数量: {payload['limit']}")
    print("\n开始处理...")
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{BASE_URL}/process/all/parallel",
            json=payload,
            timeout=1200  # 20分钟超时
        )
        elapsed_time = time.time() - start_time
        
        print(f"\n状态码: {response.status_code}")
        print(f"处理耗时: {elapsed_time:.2f} 秒 ({elapsed_time/60:.2f} 分钟)")
        
        if response.status_code == 200:
            data = response.json()
            print_result(data, show_failed_ids=True)
            
            if data.get('processed', 0) > 0:
                speed = data.get('processed', 0) / elapsed_time if elapsed_time > 0 else 0
                print(f"\n处理速度: {speed:.2f} 张/秒")
        else:
            print(f"错误: {response.text}")
    except Exception as e:
        print(f"请求失败: {e}")
        import traceback
        traceback.print_exc()


def test_parallel_force_reprocess():
    """测试强制重新处理"""
    print_section("测试5: 强制重新处理（前10张图片）")
    
    payload = {
        "limit": 10,
        "skip_processed": False,
        "force_reprocess": True,
        "max_workers": 4
    }
    
    print("警告: 这将强制重新处理已存在的图片")
    print("按 Ctrl+C 取消，或等待3秒后继续...")
    
    try:
        time.sleep(3)
    except KeyboardInterrupt:
        print("\n已取消")
        return
    
    print("\n开始处理...")
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{BASE_URL}/process/all/parallel",
            json=payload,
            timeout=300
        )
        elapsed_time = time.time() - start_time
        
        print(f"\n状态码: {response.status_code}")
        print(f"处理耗时: {elapsed_time:.2f} 秒")
        
        if response.status_code == 200:
            data = response.json()
            print_result(data)
        else:
            print(f"错误: {response.text}")
    except Exception as e:
        print(f"请求失败: {e}")


def test_parallel_large_batch():
    """测试大批量处理（需要确认）"""
    print_section("测试6: 大批量并行处理")
    
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
        print("按 Ctrl+C 取消，或等待5秒后继续...")
        time.sleep(5)
        
        payload = {
            "limit": limit,
            "skip_processed": True,
            "force_reprocess": False,
            "max_workers": 16
        }
        
        print("\n开始处理...")
        start_time = time.time()
        
        response = requests.post(
            f"{BASE_URL}/process/all/parallel",
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
    print("  并行处理接口测试脚本")
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
            test_parallel_basic()
        elif test_name == "workers":
            test_parallel_different_workers()
        elif test_name == "compare":
            test_parallel_vs_serial()
        elif test_name == "custom":
            test_parallel_custom_config()
        elif test_name == "force":
            test_parallel_force_reprocess()
        elif test_name == "large":
            test_parallel_large_batch()
        elif test_name == "all":
            test_parallel_basic()
            test_parallel_different_workers()
            test_parallel_vs_serial()
            test_parallel_custom_config()
        else:
            print(f"未知的测试: {test_name}")
            print_usage()
    else:
        # 默认运行基本测试
        test_parallel_basic()
        test_parallel_vs_serial()
        
        print("\n" + "=" * 70)
        print("提示: 运行更多测试")
        print("=" * 70)
        print("  python scripts/test_process_all_parallel.py basic    - 基本测试")
        print("  python scripts/test_process_all_parallel.py workers - 不同线程数对比")
        print("  python scripts/test_process_all_parallel.py compare  - 并行vs串行对比")
        print("  python scripts/test_process_all_parallel.py custom   - 自定义配置测试")
        print("  python scripts/test_process_all_parallel.py force    - 强制重新处理测试")
        print("  python scripts/test_process_all_parallel.py large    - 大批量处理测试")
        print("  python scripts/test_process_all_parallel.py all      - 运行所有测试")
        print("=" * 70)


def print_usage():
    """打印使用说明"""
    print("\n使用方法:")
    print("  python scripts/test_process_all_parallel.py [test_name]")
    print("\n可用的测试:")
    print("  basic    - 基本并行处理测试")
    print("  workers  - 不同线程数性能对比")
    print("  compare  - 并行vs串行性能对比")
    print("  custom   - 自定义配置测试")
    print("  force    - 强制重新处理测试")
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
