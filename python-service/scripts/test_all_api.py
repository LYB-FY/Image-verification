#!/usr/bin/env python
"""
完整的API接口测试脚本
"""
import requests
import json
import os
from io import BytesIO

BASE_URL = "http://localhost:8000"


def print_section(title):
    """打印分隔线"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_root():
    """测试根路径"""
    print_section("测试根路径")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"状态码: {response.status_code}")
        data = response.json()
        print(f"服务名称: {data.get('service')}")
        print(f"版本: {data.get('version')}")
        print(f"模型: {data.get('model')}")
        print(f"状态: {data.get('status')}")
        assert response.status_code == 200, "根路径测试失败"
        print("[PASS] 根路径测试通过")
    except Exception as e:
        print(f"[FAIL] 根路径测试失败: {e}")


def test_health():
    """测试健康检查"""
    print_section("测试健康检查")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"状态码: {response.status_code}")
        data = response.json()
        print(f"状态: {data.get('status')}")
        print(f"模型已加载: {data.get('model_loaded')}")
        print(f"特征维度: {data.get('feature_dimension')}")
        assert response.status_code == 200, "健康检查失败"
        assert data.get('model_loaded') == True, "模型未加载"
        print("[PASS] 健康检查测试通过")
    except Exception as e:
        print(f"[FAIL] 健康检查测试失败: {e}")


def test_extract_from_url():
    """测试从URL提取特征"""
    print_section("测试从URL提取特征向量")
    try:
        image_url = "https://storage.googleapis.com/download.tensorflow.org/example_images/grace_hopper.jpg"
        print(f"图片URL: {image_url}")
        response = requests.post(
            f"{BASE_URL}/extract/url",
            params={"image_url": image_url},
            timeout=30
        )
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            dimension = data.get('dimension')
            feature_vector = data.get('feature_vector')
            print(f"特征向量维度: {dimension}")
            print(f"特征向量长度: {len(feature_vector)}")
            print(f"特征向量前5个值: {feature_vector[:5]}")
            print(f"特征向量后5个值: {feature_vector[-5:]}")
            assert dimension == 1280, f"特征维度不正确，期望1280，实际{dimension}"
            assert len(feature_vector) == 1280, "特征向量长度不正确"
            print("[PASS] 从URL提取特征测试通过")
        else:
            print(f"[FAIL] 请求失败: {response.text}")
    except Exception as e:
        print(f"[FAIL] 从URL提取特征测试失败: {e}")


def test_extract_from_upload():
    """测试从上传文件提取特征"""
    print_section("测试从上传文件提取特征向量")
    try:
        # 下载测试图片
        image_url = "https://storage.googleapis.com/download.tensorflow.org/example_images/grace_hopper.jpg"
        print(f"下载测试图片: {image_url}")
        img_response = requests.get(image_url, timeout=30)
        img_data = img_response.content
        
        # 上传文件
        files = {'file': ('test_image.jpg', BytesIO(img_data), 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/extract/upload",
            files=files,
            timeout=30
        )
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            dimension = data.get('dimension')
            feature_vector = data.get('feature_vector')
            print(f"特征向量维度: {dimension}")
            print(f"特征向量长度: {len(feature_vector)}")
            print(f"特征向量前5个值: {feature_vector[:5]}")
            assert dimension == 1280, f"特征维度不正确，期望1280，实际{dimension}"
            assert len(feature_vector) == 1280, "特征向量长度不正确"
            print("[PASS] 从上传文件提取特征测试通过")
        else:
            print(f"[FAIL] 请求失败: {response.text}")
    except Exception as e:
        print(f"[FAIL] 从上传文件提取特征测试失败: {e}")


def test_process_image():
    """测试处理图片（提取并保存到数据库）"""
    print_section("测试处理图片（提取并保存）")
    try:
        payload = {
            "image_id": "test_123456",
            "image_url": "https://storage.googleapis.com/download.tensorflow.org/example_images/grace_hopper.jpg"
        }
        print(f"图片ID: {payload['image_id']}")
        print(f"图片URL: {payload['image_url']}")
        
        response = requests.post(
            f"{BASE_URL}/process/image",
            json=payload,
            timeout=60
        )
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"成功: {data.get('success')}")
            print(f"图片ID: {data.get('image_id')}")
            print(f"特征维度: {data.get('dimension')}")
            print(f"消息: {data.get('message')}")
            assert data.get('success') == True, "处理失败"
            print("[PASS] 处理图片测试通过")
        else:
            print(f"[FAIL] 请求失败: {response.text}")
    except Exception as e:
        print(f"[FAIL] 处理图片测试失败: {e}")


def test_batch_process():
    """测试批量处理图片"""
    print_section("测试批量处理图片")
    try:
        image_ids = [
            "test_batch_1",
            "test_batch_2",
            "test_batch_3"
        ]
        print(f"批量处理图片ID: {image_ids}")
        
        response = requests.post(
            f"{BASE_URL}/process/batch",
            json=image_ids,
            timeout=120
        )
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"总数: {data.get('total')}")
            print(f"成功: {data.get('success')}")
            print(f"失败: {data.get('failed')}")
            print(f"失败的ID: {data.get('failed_ids')}")
            print("[PASS] 批量处理测试通过")
        else:
            print(f"[FAIL] 请求失败: {response.text}")
    except Exception as e:
        print(f"[FAIL] 批量处理测试失败: {e}")


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("  Python服务API接口完整测试")
    print("=" * 60)
    
    try:
        # 基础接口测试
        test_root()
        test_health()
        
        # 特征提取测试
        test_extract_from_url()
        test_extract_from_upload()
        
        # 数据库操作测试（可选，需要数据库连接）
        # test_process_image()
        # test_batch_process()
        
        print("\n" + "=" * 60)
        print("  所有测试完成！")
        print("=" * 60)
        print("\n提示:")
        print("- 访问 http://localhost:8000/docs 查看完整API文档")
        print("- 访问 http://localhost:8000/health 检查服务状态")
        
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] 错误: 无法连接到服务")
        print("提示: 请先运行 'python run.py' 启动服务")
    except Exception as e:
        print(f"\n[ERROR] 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
