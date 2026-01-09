#!/usr/bin/env python
"""
测试处理所有图片接口
"""
import requests
import json

BASE_URL = "http://localhost:8000"


def test_process_all_images():
    """测试处理所有图片接口"""
    print("=" * 60)
    print("测试处理所有图片接口")
    print("=" * 60)
    
    # 测试1: 处理前10张未处理的图片
    print("\n[测试1] 处理前10张未处理的图片...")
    payload = {
        "limit": 10,
        "skip_processed": True,
        "force_reprocess": False
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/process/all",
            json=payload,
            timeout=300  # 5分钟超时
        )
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"总图片数: {data.get('total')}")
            print(f"已处理: {data.get('processed')}")
            print(f"成功: {data.get('success')}")
            print(f"失败: {data.get('failed')}")
            print(f"跳过: {data.get('skipped')}")
            print(f"消息: {data.get('message')}")
            
            if data.get('failed_ids'):
                print(f"失败的ID: {data.get('failed_ids')[:10]}...")  # 只显示前10个
        else:
            print(f"错误: {response.text}")
    except Exception as e:
        print(f"请求失败: {e}")


def test_process_all_without_limit():
    """测试处理所有图片（无限制）"""
    print("\n" + "=" * 60)
    print("测试处理所有图片（无限制）")
    print("=" * 60)
    print("\n[警告] 这将处理所有未处理的图片，可能需要很长时间！")
    print("按 Ctrl+C 取消，或等待5秒后继续...")
    
    import time
    try:
        time.sleep(5)
    except KeyboardInterrupt:
        print("\n已取消")
        return
    
    payload = {
        "skip_processed": True,
        "force_reprocess": False
    }
    
    try:
        print("\n开始处理...")
        response = requests.post(
            f"{BASE_URL}/process/all",
            json=payload,
            timeout=3600  # 1小时超时
        )
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n处理结果:")
            print(f"  总图片数: {data.get('total')}")
            print(f"  已处理: {data.get('processed')}")
            print(f"  成功: {data.get('success')}")
            print(f"  失败: {data.get('failed')}")
            print(f"  跳过: {data.get('skipped')}")
            print(f"  消息: {data.get('message')}")
        else:
            print(f"错误: {response.text}")
    except KeyboardInterrupt:
        print("\n处理被中断")
    except Exception as e:
        print(f"请求失败: {e}")


def test_force_reprocess():
    """测试强制重新处理"""
    print("\n" + "=" * 60)
    print("测试强制重新处理（前5张）")
    print("=" * 60)
    
    payload = {
        "limit": 5,
        "skip_processed": False,  # 不跳过已处理的
        "force_reprocess": True  # 强制重新处理
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/process/all",
            json=payload,
            timeout=300
        )
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"总图片数: {data.get('total')}")
            print(f"已处理: {data.get('processed')}")
            print(f"成功: {data.get('success')}")
            print(f"失败: {data.get('failed')}")
            print(f"跳过: {data.get('skipped')}")
            print(f"消息: {data.get('message')}")
        else:
            print(f"错误: {response.text}")
    except Exception as e:
        print(f"请求失败: {e}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "all":
            test_process_all_without_limit()
        elif sys.argv[1] == "force":
            test_force_reprocess()
        else:
            test_process_all_images()
    else:
        # 默认只测试处理前10张
        test_process_all_images()
        
        print("\n" + "=" * 60)
        print("提示:")
        print("  - 运行 'python scripts/test_process_all.py all' 处理所有图片")
        print("  - 运行 'python scripts/test_process_all.py force' 测试强制重新处理")
        print("=" * 60)
