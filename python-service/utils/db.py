"""
数据库连接工具
"""
import psycopg2
from psycopg2 import pool
from typing import Optional, List
from config import settings


class Database:
    """数据库连接管理类"""
    
    _connection_pool: Optional[pool.ThreadedConnectionPool] = None
    
    @classmethod
    def get_connection_pool(cls):
        """获取数据库连接池"""
        if cls._connection_pool is None:
            cls._connection_pool = pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=20,
                host=settings.postgres_host,
                port=settings.postgres_port,
                user=settings.postgres_user,
                password=settings.postgres_password,
                database=settings.postgres_database
            )
        return cls._connection_pool
    
    @classmethod
    def get_connection(cls):
        """从连接池获取连接"""
        pool = cls.get_connection_pool()
        return pool.getconn()
    
    @classmethod
    def return_connection(cls, conn):
        """归还连接到连接池"""
        pool = cls.get_connection_pool()
        pool.putconn(conn)
    
    @classmethod
    def close_all(cls):
        """关闭所有连接"""
        if cls._connection_pool:
            cls._connection_pool.closeall()
            cls._connection_pool = None


def get_db_connection():
    """获取数据库连接的上下文管理器"""
    return Database.get_connection()


def save_feature_vector(image_id: str, feature_vector: list, vector_dimension: int, model_version: str = "MobileNetV2-GPU"):
    """保存特征向量到数据库"""
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        # 将image_id转换为整数（数据库中是BIGINT类型）
        image_id_int = int(image_id)
        
        # 将特征向量转换为PostgreSQL vector类型格式
        vector_string = f"[{','.join(map(str, feature_vector))}]"
        
        # 插入或更新特征向量
        cursor.execute(
            """
            INSERT INTO tb_hsx_img_value 
            (image_id, feature_vector, vector_dimension, model_version) 
            VALUES (%s, %s::vector, %s, %s)
            ON CONFLICT (image_id) DO UPDATE 
            SET feature_vector = EXCLUDED.feature_vector,
                vector_dimension = EXCLUDED.vector_dimension,
                model_version = EXCLUDED.model_version,
                update_time = CURRENT_TIMESTAMP
            """,
            (image_id_int, vector_string, vector_dimension, model_version)
        )
        
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            Database.return_connection(conn)


def save_feature_vectors_batch(data: List[tuple]) -> int:
    """批量保存特征向量到数据库
    
    Args:
        data: 元组列表，每个元组包含 (image_id, feature_vector, vector_dimension, model_version)
    
    Returns:
        成功保存的数量
    """
    if not data:
        return 0
    
    conn = None
    success_count = 0
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        # 准备批量插入数据
        insert_data = []
        for image_id, feature_vector, vector_dimension, model_version in data:
            image_id_int = int(image_id)
            vector_string = f"[{','.join(map(str, feature_vector))}]"
            insert_data.append((image_id_int, vector_string, vector_dimension, model_version))
        
        # 批量插入或更新
        cursor.executemany(
            """
            INSERT INTO tb_hsx_img_value 
            (image_id, feature_vector, vector_dimension, model_version) 
            VALUES (%s, %s::vector, %s, %s)
            ON CONFLICT (image_id) DO UPDATE 
            SET feature_vector = EXCLUDED.feature_vector,
                vector_dimension = EXCLUDED.vector_dimension,
                model_version = EXCLUDED.model_version,
                update_time = CURRENT_TIMESTAMP
            """,
            insert_data
        )
        
        conn.commit()
        success_count = len(insert_data)
        cursor.close()
        return success_count
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            Database.return_connection(conn)


def check_feature_exists(image_id: str) -> bool:
    """检查图片特征向量是否已存在"""
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        # 将image_id转换为整数进行查询
        image_id_int = int(image_id)
        cursor.execute(
            "SELECT id FROM tb_hsx_img_value WHERE image_id = %s",
            (image_id_int,)
        )
        
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists
    except Exception as e:
        raise e
    finally:
        if conn:
            Database.return_connection(conn)


def check_features_exist_batch(image_ids: List[str]) -> set:
    """批量检查图片特征向量是否已存在
    
    Args:
        image_ids: 图片ID列表
        
    Returns:
        已存在的图片ID集合
    """
    if not image_ids:
        return set()
    
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        # 将image_id转换为整数列表
        image_id_ints = [int(img_id) for img_id in image_ids]
        
        # 批量查询
        cursor.execute(
            "SELECT image_id FROM tb_hsx_img_value WHERE image_id = ANY(%s)",
            (image_id_ints,)
        )
        
        existing_ids = {str(row[0]) for row in cursor.fetchall()}
        cursor.close()
        return existing_ids
    except Exception as e:
        raise e
    finally:
        if conn:
            Database.return_connection(conn)


def get_image_url(image_id: str) -> Optional[str]:
    """从数据库获取图片URL"""
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT url FROM ecai.tb_image WHERE id::text = %s",
            (image_id,)
        )
        
        result = cursor.fetchone()
        cursor.close()
        return result[0] if result else None
    except Exception as e:
        raise e
    finally:
        if conn:
            Database.return_connection(conn)


def get_all_images(limit: Optional[int] = None, skip_processed: bool = True):
    """获取所有图片信息
    
    Args:
        limit: 限制返回数量，None表示返回所有
        skip_processed: 是否跳过已处理的图片
    
    Returns:
        图片列表，每个元素包含 (image_id, url)
    """
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        if skip_processed:
            # 只查询未处理的图片
            if limit:
                cursor.execute("""
                    SELECT i.id::text as id, i.url 
                    FROM ecai.tb_image i
                    LEFT JOIN tb_hsx_img_value f ON i.id = f.image_id
                    WHERE f.id IS NULL
                    LIMIT %s
                """, (limit,))
            else:
                cursor.execute("""
                    SELECT i.id::text as id, i.url 
                    FROM ecai.tb_image i
                    LEFT JOIN tb_hsx_img_value f ON i.id = f.image_id
                    WHERE f.id IS NULL
                """)
        else:
            # 查询所有图片
            if limit:
                cursor.execute("""
                    SELECT id::text as id, url 
                    FROM ecai.tb_image
                    LIMIT %s
                """, (limit,))
            else:
                cursor.execute("""
                    SELECT id::text as id, url 
                    FROM ecai.tb_image
                """)
        
        results = cursor.fetchall()
        cursor.close()
        return [(row[0], row[1]) for row in results]
    except Exception as e:
        raise e
    finally:
        if conn:
            Database.return_connection(conn)


def get_total_image_count(skip_processed: bool = True) -> int:
    """获取图片总数
    
    Args:
        skip_processed: 是否只统计未处理的图片
    
    Returns:
        图片数量
    """
    conn = None
    try:
        conn = Database.get_connection()
        cursor = conn.cursor()
        
        if skip_processed:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM ecai.tb_image i
                LEFT JOIN tb_hsx_img_value f ON i.id = f.image_id
                WHERE f.id IS NULL
            """)
        else:
            cursor.execute("SELECT COUNT(*) FROM ecai.tb_image")
        
        result = cursor.fetchone()
        cursor.close()
        return result[0] if result else 0
    except Exception as e:
        raise e
    finally:
        if conn:
            Database.return_connection(conn)
