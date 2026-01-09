#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
查询 tb_image 表中的数据总数
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import Database, get_total_image_count
from config import settings

# 强制刷新输出
sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None


def count_tb_image():
    """查询 tb_image 表中的数据总数"""
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        # 查询总数
        cursor.execute("SELECT COUNT(*) FROM ecai.tb_image")
        result = cursor.fetchone()
        total_count = result[0] if result else 0
        
        cursor.close()
        return total_count
    except Exception as e:
        print(f"[ERROR] 查询失败: {e}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc()
        return None
    finally:
        if conn:
            Database.return_connection(conn)


def main():
    """主函数"""
    try:
        print("=" * 60, flush=True)
        print("  查询 tb_image 表数据总数", flush=True)
        print("=" * 60, flush=True)
        print(f"\n数据库配置:", flush=True)
        print(f"  主机: {settings.postgres_host}", flush=True)
        print(f"  端口: {settings.postgres_port}", flush=True)
        print(f"  数据库: {settings.postgres_database}", flush=True)
        print(f"  用户: {settings.postgres_user}", flush=True)
        print(flush=True)
        
        # 查询总数
        print("正在查询...", flush=True)
        total_count = count_tb_image()
        
        if total_count is not None:
            print(f"\n{'=' * 60}", flush=True)
            print(f"  tb_image 表总记录数: {total_count:,}", flush=True)
            print(f"{'=' * 60}\n", flush=True)
            
            # 使用工具函数查询未处理的图片数（可选）
            try:
                unprocessed_count = get_total_image_count(skip_processed=True)
                processed_count = total_count - unprocessed_count
                print(f"已处理图片数: {processed_count:,}", flush=True)
                print(f"未处理图片数: {unprocessed_count:,}", flush=True)
            except Exception as e:
                print(f"[INFO] 无法获取处理状态统计: {e}", flush=True)
        else:
            print("\n[ERROR] 查询失败，请检查数据库连接和配置", flush=True)
    finally:
        # 关闭连接池
        try:
            Database.close_all()
        except:
            pass


if __name__ == "__main__":
    main()
