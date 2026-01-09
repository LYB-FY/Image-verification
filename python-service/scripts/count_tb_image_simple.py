# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import Database

output_file = os.path.join(os.path.dirname(__file__), 'count_result.txt')

try:
    conn = Database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM ecai.tb_image")
    result = cursor.fetchone()
    total = result[0] if result else 0
    
    # 查询已处理和未处理的数量
    cursor.execute("""
        SELECT COUNT(*) 
        FROM ecai.tb_image i
        LEFT JOIN tb_hsx_img_value f ON i.id = f.image_id
        WHERE f.id IS NULL
    """)
    unprocessed = cursor.fetchone()[0]
    processed = total - unprocessed
    
    # 输出到控制台和文件
    result_text = f"""tb_image 表总记录数: {total:,}
已处理图片数: {processed:,}
未处理图片数: {unprocessed:,}
"""
    print(result_text)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(result_text)
    
    cursor.close()
    Database.return_connection(conn)
except Exception as e:
    error_msg = f"查询失败: {e}\n"
    print(error_msg)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(error_msg)
    import traceback
    traceback.print_exc()
finally:
    Database.close_all()
