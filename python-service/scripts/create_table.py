#!/usr/bin/env python
"""
创建特征向量表
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import Database
from config import settings


def create_table():
    """创建特征向量表"""
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        # 创建表的SQL
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS tb_hsx_img_value (
            id BIGSERIAL PRIMARY KEY,
            image_id BIGINT NOT NULL UNIQUE,
            feature_vector vector(1280) NOT NULL,
            vector_dimension INTEGER NOT NULL DEFAULT 1280,
            model_version VARCHAR(50) NOT NULL DEFAULT 'MobileNetV2',
            create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        # 创建索引
        create_index_sql = """
        CREATE INDEX IF NOT EXISTS idx_tb_hsx_img_value_image_id 
        ON tb_hsx_img_value(image_id);
        
        CREATE INDEX IF NOT EXISTS idx_tb_hsx_img_value_feature_vector 
        ON tb_hsx_img_value USING hnsw (feature_vector vector_cosine_ops);
        """
        
        print("正在创建表 tb_hsx_img_value...")
        cursor.execute(create_table_sql)
        print("[PASS] 表创建成功")
        
        print("正在创建索引...")
        cursor.execute(create_index_sql)
        print("[PASS] 索引创建成功")
        
        conn.commit()
        cursor.close()
        
        print("\n[SUCCESS] 表创建完成！")
        return True
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[FAIL] 创建表失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            Database.return_connection(conn)


def check_table():
    """检查表是否存在"""
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tb_hsx_img_value'
            );
        """)
        exists = cursor.fetchone()[0]
        
        if exists:
            print("[INFO] 表 tb_hsx_img_value 已存在")
            
            # 显示表结构
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = 'tb_hsx_img_value'
                ORDER BY ordinal_position;
            """)
            columns = cursor.fetchall()
            
            print("\n表结构:")
            for col in columns:
                col_name, col_type, is_nullable, default = col
                nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
                default_str = f" DEFAULT {default}" if default else ""
                print(f"  - {col_name}: {col_type} {nullable}{default_str}")
        else:
            print("[INFO] 表 tb_hsx_img_value 不存在")
        
        cursor.close()
        return exists
        
    except Exception as e:
        print(f"[FAIL] 检查表失败: {e}")
        return False
    finally:
        if conn:
            Database.return_connection(conn)


if __name__ == "__main__":
    print("=" * 60)
    print("  创建特征向量表")
    print("=" * 60)
    
    # 先检查表是否存在
    if check_table():
        print("\n[INFO] 表已存在，无需创建")
    else:
        print("\n[INFO] 表不存在，开始创建...")
        create_table()
        
        # 再次检查
        print("\n验证表创建结果...")
        check_table()
    
    Database.close_all()
