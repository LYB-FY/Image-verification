"""
测试脚本：测试图片向量提取功能
"""
from vector_extractor import MobileNetV3VectorExtractor
import json

def test_extract_vector():
    """测试从URL提取向量"""
    # 使用一个公开的测试图片URL
    test_url = "https://assets.ecaisys.com/2024/5/14/CXO56PIAWG/7/tmp_e489272e2e2ca33b4e47bd1afb99a6b05f82710133a9fb75.jpg"
    
    print("=" * 60)
    print("MobileNetV3-Large 图片向量提取测试")
    print("=" * 60)
    
    try:
        # 创建特征提取器
        print("\n1. 初始化特征提取器...")
        extractor = MobileNetV3VectorExtractor()
        print(f"   ✓ 特征提取器初始化成功")
        print(f"   ✓ 使用设备: {'GPU' if extractor.use_gpu else 'CPU'}")
        print(f"   ✓ 特征维度: {extractor.get_feature_dimension()}")
        
        # 提取特征向量
        print(f"\n2. 从URL提取特征向量...")
        print(f"   URL: {test_url}")
        vector = extractor.extract_vector_from_url(test_url)
        
        # 显示结果
        print(f"\n3. 提取结果:")
        print(f"   ✓ 向量维度: {len(vector)}")
        print(f"   ✓ 向量前5个值: {vector[:5]}")
        print(f"   ✓ 向量后5个值: {vector[-5:]}")
        
        # 验证向量归一化
        import numpy as np
        norm = np.linalg.norm(vector)
        print(f"   ✓ 向量L2范数: {norm:.6f} (应该接近1.0)")
        
        print("\n" + "=" * 60)
        print("测试成功！")
        print("=" * 60)
        
        return vector
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    test_extract_vector()
