#!/usr/bin/env python
"""
测试API接口的脚本
"""
import requests
import json

BASE_URL = "http://localhost:8000"


def test_health():
    """测试健康检查"""
    print("测试健康检查...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    print()


def test_extract_from_url():
    """测试从URL提取特征"""
    print("测试从URL提取特征...")
    image_url = "https://storage.googleapis.com/download.tensorflow.org/example_images/grace_hopper.jpg"
    response = requests.post(f"{BASE_URL}/extract/url", params={"image_url": image_url})
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"特征向量维度: {data['dimension']}")
        print(f"特征向量前10个值: {data['feature_vector'][:10]}")
    else:
        print(f"错误: {response.text}")
    print()


def test_process_image():
    """测试处理图片"""
    print("测试处理图片...")
    # 注意：需要替换为实际的image_id和image_url
    payload = {
        "image_id": "123456",
        "image_url": "https://storage.googleapis.com/download.tensorflow.org/example_images/grace_hopper.jpg"
    }
    response = requests.post(f"{BASE_URL}/process/image", json=payload)
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    print()


def test_root():
    """测试根路径"""
    print("=" * 50)
    print("测试根路径...")
    response = requests.get(f"{BASE_URL}/")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    print()


if __name__ == "__main__":
    try:
        print("=" * 50)
        print("开始测试API接口")
        print("=" * 50)
        print()
        
        test_root()
        test_health()
        test_extract_from_url()
        # test_process_image()  # 取消注释以测试处理图片功能
        
        print("=" * 50)
        print("所有测试完成！")
        print("=" * 50)
    except requests.exceptions.ConnectionError:
        print("错误: 无法连接到服务，请确保服务正在运行")
        print("提示: 运行 'python run.py' 启动服务")
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
