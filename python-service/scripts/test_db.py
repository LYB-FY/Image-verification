#!/usr/bin/env python
"""
测试数据库连接和操作
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import (
    Database,
    get_db_connection,
    save_feature_vector,
    check_feature_exists,
    get_image_url
)
from config import settings


def print_section(title):
    """打印分隔线"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_db_config():
    """测试数据库配置"""
    print_section("测试数据库配置")
    print(f"数据库主机: {settings.postgres_host}")
    print(f"数据库端口: {settings.postgres_port}")
    print(f"数据库用户: {settings.postgres_user}")
    print(f"数据库名称: {settings.postgres_database}")
    print(f"密码: {'*' * len(settings.postgres_password)}")
    print("[INFO] 数据库配置读取成功")


def test_db_connection():
    """测试数据库连接"""
    print_section("测试数据库连接")
    conn = None
    try:
        conn = Database.get_connection()
        print("[PASS] 数据库连接成功")
        
        # 测试查询
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"PostgreSQL版本: {version[0]}")
        cursor.close()
        
        return True
    except Exception as e:
        print(f"[FAIL] 数据库连接失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            Database.return_connection(conn)


def test_table_exists():
    """测试表是否存在"""
    print_section("测试表是否存在")
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        # 检查 tb_hsx_img_value 表
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tb_hsx_img_value'
            );
        """)
        exists = cursor.fetchone()[0]
        if exists:
            print("[PASS] tb_hsx_img_value 表存在")
        else:
            print("[WARN] tb_hsx_img_value 表不存在")
        
        # 检查 ecai.tb_image 表
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'ecai' 
                AND table_name = 'tb_image'
            );
        """)
        exists = cursor.fetchone()[0]
        if exists:
            print("[PASS] ecai.tb_image 表存在")
        else:
            print("[WARN] ecai.tb_image 表不存在")
        
        cursor.close()
        return True
    except Exception as e:
        print(f"[FAIL] 检查表失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            Database.return_connection(conn)


def test_vector_extension():
    """测试vector扩展是否安装"""
    print_section("测试vector扩展")
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        # 检查vector扩展
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM pg_extension 
                WHERE extname = 'vector'
            );
        """)
        exists = cursor.fetchone()[0]
        if exists:
            print("[PASS] vector 扩展已安装")
        else:
            print("[WARN] vector 扩展未安装，需要安装pgvector扩展")
            print("提示: CREATE EXTENSION IF NOT EXISTS vector;")
        
        cursor.close()
        return True
    except Exception as e:
        print(f"[FAIL] 检查vector扩展失败: {e}")
        return False
    finally:
        if conn:
            Database.return_connection(conn)


def test_save_feature_vector():
    """测试保存特征向量"""
    print_section("测试保存特征向量")
    try:
        # 先获取一个存在的图片ID用于测试
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM ecai.tb_image LIMIT 1;")
        result = cursor.fetchone()
        
        if not result:
            print("[WARN] 数据库中没有图片数据，跳过保存测试")
            cursor.close()
            Database.return_connection(conn)
            return True
        
        test_image_id = str(result[0])  # 转换为字符串
        cursor.close()
        Database.return_connection(conn)
        
        # 创建测试特征向量（1280维）
        test_vector = [0.1] * 1280
        
        # 先删除可能存在的测试数据
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tb_hsx_img_value WHERE image_id = %s", (int(test_image_id),))
        conn.commit()
        cursor.close()
        Database.return_connection(conn)
        
        # 保存特征向量
        save_feature_vector(
            image_id=test_image_id,
            feature_vector=test_vector,
            vector_dimension=1280,
            model_version="MobileNetV2-GPU-Test"
        )
        print(f"[PASS] 特征向量保存成功 (image_id: {test_image_id})")
        
        # 验证是否保存成功
        exists = check_feature_exists(test_image_id)
        if exists:
            print("[PASS] 特征向量验证成功")
        else:
            print("[FAIL] 特征向量验证失败")
        
        # 清理测试数据
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tb_hsx_img_value WHERE image_id = %s", (int(test_image_id),))
        conn.commit()
        cursor.close()
        Database.return_connection(conn)
        print("[INFO] 测试数据已清理")
        
        return True
    except Exception as e:
        print(f"[FAIL] 保存特征向量失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_check_feature_exists():
    """测试检查特征是否存在"""
    print_section("测试检查特征是否存在")
    try:
        # 测试不存在的ID（使用一个很大的数字）
        exists = check_feature_exists("999999999999999999")
        if not exists:
            print("[PASS] 不存在的ID检查正确")
        else:
            print("[FAIL] 不存在的ID检查错误")
        
        return True
    except Exception as e:
        print(f"[FAIL] 检查特征存在性失败: {e}")
        return False


def test_get_image_url():
    """测试获取图片URL"""
    print_section("测试获取图片URL")
    conn = None
    try:
        # 先查询一个存在的图片ID（如果有）
        conn = Database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id::text FROM ecai.tb_image LIMIT 1;")
        result = cursor.fetchone()
        cursor.close()
        Database.return_connection(conn)
        
        if result:
            image_id = result[0]
            url = get_image_url(image_id)
            if url:
                print(f"[PASS] 获取图片URL成功 (image_id: {image_id})")
                print(f"      URL: {url[:80]}..." if len(url) > 80 else f"      URL: {url}")
            else:
                print(f"[WARN] 图片ID存在但URL为空 (image_id: {image_id})")
        else:
            print("[INFO] 数据库中没有图片数据，跳过URL测试")
        
        # 测试不存在的ID
        url = get_image_url("non_existent_id_99999")
        if url is None:
            print("[PASS] 不存在的ID返回None正确")
        else:
            print("[FAIL] 不存在的ID应该返回None")
        
        return True
    except Exception as e:
        print(f"[FAIL] 获取图片URL失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_table_structure():
    """测试表结构"""
    print_section("测试表结构")
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        # 检查 tb_hsx_img_value 表结构
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'tb_hsx_img_value'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        
        if columns:
            print("[INFO] tb_hsx_img_value 表结构:")
            for col in columns:
                col_name, col_type, col_length = col
                length_info = f"({col_length})" if col_length else ""
                print(f"  - {col_name}: {col_type}{length_info}")
        else:
            print("[WARN] 无法获取表结构信息")
        
        cursor.close()
        return True
    except Exception as e:
        print(f"[FAIL] 获取表结构失败: {e}")
        return False
    finally:
        if conn:
            Database.return_connection(conn)


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("  数据库连接和操作测试")
    print("=" * 60)
    
    results = []
    
    # 测试数据库配置
    test_db_config()
    
    # 测试数据库连接
    results.append(("数据库连接", test_db_connection()))
    
    if not results[-1][1]:
        print("\n[ERROR] 数据库连接失败，无法继续测试")
        print("请检查:")
        print("1. 数据库服务是否运行")
        print("2. 数据库配置是否正确")
        print("3. 网络连接是否正常")
        return
    
    # 测试表是否存在
    results.append(("表存在性检查", test_table_exists()))
    
    # 测试vector扩展
    results.append(("vector扩展", test_vector_extension()))
    
    # 测试表结构
    test_table_structure()
    
    # 测试检查特征存在性
    results.append(("检查特征存在性", test_check_feature_exists()))
    
    # 测试获取图片URL
    results.append(("获取图片URL", test_get_image_url()))
    
    # 测试保存特征向量
    results.append(("保存特征向量", test_save_feature_vector()))
    
    # 关闭连接池
    try:
        Database.close_all()
        print("\n[INFO] 数据库连接池已关闭")
    except:
        pass
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("  测试结果汇总")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} {name}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n[SUCCESS] 所有数据库测试通过！")
    else:
        print("\n[WARNING] 部分测试失败，请检查上述错误信息")


if __name__ == "__main__":
    main()
