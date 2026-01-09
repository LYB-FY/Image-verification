"""
FastAPI应用主文件
提供图片特征向量提取和初始化的REST API
"""
import logging
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from models.image_feature_extractor import get_feature_extractor
from utils.db import (
    Database,
    save_feature_vector,
    save_feature_vectors_batch,
    check_feature_exists,
    check_features_exist_batch,
    get_image_url,
    get_all_images,
    get_total_image_count
)
from config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="图片特征向量提取服务",
    description="使用MobileNetV2模型和GPU对图片进行向量初始化",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 请求/响应模型
class FeatureVectorResponse(BaseModel):
    """特征向量响应"""
    image_id: Optional[str] = None
    feature_vector: List[float]
    dimension: int
    model_version: str = "MobileNetV2-GPU"


class ProcessImageRequest(BaseModel):
    """处理图片请求"""
    image_id: str
    image_url: Optional[str] = None


class ProcessImageResponse(BaseModel):
    """处理图片响应"""
    success: bool
    image_id: str
    dimension: int
    message: str


class BatchProcessResponse(BaseModel):
    """批量处理响应"""
    total: int
    success: int
    failed: int
    failed_ids: List[str] = []


class ProcessAllImagesRequest(BaseModel):
    """处理所有图片请求"""
    limit: Optional[int] = None  # 限制处理数量，None表示处理所有
    skip_processed: bool = True  # 是否跳过已处理的图片
    force_reprocess: bool = False  # 是否强制重新处理（即使已存在）


class ProcessAllImagesResponse(BaseModel):
    """处理所有图片响应"""
    total: int  # 总图片数
    processed: int  # 已处理数量
    success: int  # 成功数量
    failed: int  # 失败数量
    skipped: int  # 跳过数量（已存在）
    failed_ids: List[str] = []  # 失败的图片ID
    message: str


class ProcessAllImagesParallelRequest(BaseModel):
    """并行处理所有图片请求"""
    limit: Optional[int] = None  # 限制处理数量，None表示处理所有
    skip_processed: bool = True  # 是否跳过已处理的图片
    force_reprocess: bool = False  # 是否强制重新处理（即使已存在）
    max_workers: Optional[int] = None  # 最大线程数，None表示使用配置值


@app.on_event("startup")
async def startup_event():
    """应用启动时初始化模型"""
    logger.info("正在初始化特征提取器...")
    try:
        extractor = get_feature_extractor()
        dimension = extractor.get_feature_dimension()
        logger.info(f"特征提取器初始化完成，特征维度: {dimension}")
    except Exception as e:
        logger.error(f"特征提取器初始化失败: {e}")
        raise


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "图片特征向量提取服务",
        "version": "1.0.0",
        "model": "MobileNetV2",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    extractor = get_feature_extractor()
    return {
        "status": "healthy",
        "model_loaded": extractor.model is not None,
        "feature_dimension": extractor.get_feature_dimension()
    }


@app.post("/extract/url", response_model=FeatureVectorResponse)
async def extract_features_from_url(image_url: str):
    """
    从图片URL提取特征向量
    
    - **image_url**: 图片的URL地址
    """
    try:
        extractor = get_feature_extractor()
        feature_vector = extractor.extract_features_from_url(image_url)
        dimension = len(feature_vector)
        
        return FeatureVectorResponse(
            feature_vector=feature_vector,
            dimension=dimension
        )
    except Exception as e:
        logger.error(f"从URL提取特征失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract/upload", response_model=FeatureVectorResponse)
async def extract_features_from_upload(file: UploadFile = File(...)):
    """
    从上传的图片文件提取特征向量
    
    - **file**: 图片文件（支持jpg, png, gif等格式）
    """
    try:
        # 读取上传的文件
        image_bytes = await file.read()
        
        extractor = get_feature_extractor()
        feature_vector = extractor.extract_features_from_bytes(image_bytes)
        dimension = len(feature_vector)
        
        return FeatureVectorResponse(
            feature_vector=feature_vector,
            dimension=dimension
        )
    except Exception as e:
        logger.error(f"从上传文件提取特征失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process/image", response_model=ProcessImageResponse)
async def process_image(request: ProcessImageRequest):
    """
    处理单张图片：提取特征向量并保存到数据库
    
    - **image_id**: 图片ID
    - **image_url**: 图片URL（可选，如果不提供则从数据库查询）
    """
    try:
        # 检查是否已存在
        if check_feature_exists(request.image_id):
            logger.info(f"图片 {request.image_id} 的特征向量已存在，跳过")
            extractor = get_feature_extractor()
            return ProcessImageResponse(
                success=True,
                image_id=request.image_id,
                dimension=extractor.get_feature_dimension(),
                message="特征向量已存在"
            )
        
        # 获取图片URL
        image_url = request.image_url
        if not image_url:
            image_url = get_image_url(request.image_id)
            if not image_url:
                raise HTTPException(
                    status_code=404,
                    detail=f"图片ID {request.image_id} 不存在或没有URL"
                )
        
        # 提取特征向量
        extractor = get_feature_extractor()
        feature_vector = extractor.extract_features_from_url(image_url)
        dimension = len(feature_vector)
        
        # 保存到数据库
        save_feature_vector(
            image_id=request.image_id,
            feature_vector=feature_vector,
            vector_dimension=dimension,
            model_version="MobileNetV2-GPU"
        )
        
        logger.info(f"图片 {request.image_id} 的特征向量已保存")
        
        return ProcessImageResponse(
            success=True,
            image_id=request.image_id,
            dimension=dimension,
            message="特征向量提取并保存成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"处理图片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process/batch", response_model=BatchProcessResponse)
async def process_batch_images(image_ids: List[str]):
    """
    批量处理图片：提取特征向量并保存到数据库
    
    - **image_ids**: 图片ID列表
    """
    success_count = 0
    failed_count = 0
    failed_ids = []
    
    extractor = get_feature_extractor()
    
    for image_id in image_ids:
        try:
            # 检查是否已存在
            if check_feature_exists(image_id):
                logger.info(f"图片 {image_id} 的特征向量已存在，跳过")
                success_count += 1
                continue
            
            # 获取图片URL
            image_url = get_image_url(image_id)
            if not image_url:
                logger.warning(f"图片ID {image_id} 不存在或没有URL")
                failed_count += 1
                failed_ids.append(image_id)
                continue
            
            # 提取特征向量
            feature_vector = extractor.extract_features_from_url(image_url)
            dimension = len(feature_vector)
            
            # 保存到数据库
            save_feature_vector(
                image_id=image_id,
                feature_vector=feature_vector,
                vector_dimension=dimension,
                model_version="MobileNetV2-GPU"
            )
            
            success_count += 1
            logger.info(f"图片 {image_id} 处理成功")
            
        except Exception as e:
            logger.error(f"处理图片 {image_id} 失败: {e}")
            failed_count += 1
            failed_ids.append(image_id)
    
    return BatchProcessResponse(
        total=len(image_ids),
        success=success_count,
        failed=failed_count,
        failed_ids=failed_ids
    )


@app.post("/process/all", response_model=ProcessAllImagesResponse)
async def process_all_images(request: ProcessAllImagesRequest):
    """
    处理所有图片：从ecai.tb_image表读取所有图片，提取特征向量并保存到tb_hsx_img_value表
    
    - **limit**: 限制处理数量，None表示处理所有
    - **skip_processed**: 是否跳过已处理的图片（默认True）
    - **force_reprocess**: 是否强制重新处理（即使已存在，默认False）
    """
    try:
        # 获取总图片数
        total_count = get_total_image_count(skip_processed=request.skip_processed)
        
        if total_count == 0:
            return ProcessAllImagesResponse(
                total=0,
                processed=0,
                success=0,
                failed=0,
                skipped=0,
                message="没有需要处理的图片"
            )
        
        # 获取所有图片
        images = get_all_images(limit=request.limit, skip_processed=request.skip_processed)
        
        if not images:
            return ProcessAllImagesResponse(
                total=total_count,
                processed=0,
                success=0,
                failed=0,
                skipped=0,
                message="没有找到需要处理的图片"
            )
        
        logger.info(f"开始处理 {len(images)} 张图片（总计: {total_count}）")
        
        extractor = get_feature_extractor()
        success_count = 0
        failed_count = 0
        skipped_count = 0
        failed_ids = []
        
        # 分批处理，避免一次性处理过多数据
        chunk_size = settings.process_chunk_size
        total_chunks = (len(images) + chunk_size - 1) // chunk_size
        
        logger.info(f"将分 {total_chunks} 批处理，每批 {chunk_size} 张图片")
        
        for chunk_idx in range(total_chunks):
            start_idx = chunk_idx * chunk_size
            end_idx = min(start_idx + chunk_size, len(images))
            chunk_images = images[start_idx:end_idx]
            
            logger.info(f"[批次 {chunk_idx + 1}/{total_chunks}] 处理图片 {start_idx + 1}-{end_idx}（共 {len(chunk_images)} 张）...")
            
            # 批量检查已存在的图片（优化数据库查询）
            if not request.force_reprocess:
                chunk_image_ids = [img[0] for img in chunk_images]
                existing_ids = check_features_exist_batch(chunk_image_ids)
                # 过滤掉已存在的图片
                chunk_images = [(img_id, url) for img_id, url in chunk_images if img_id not in existing_ids]
                skipped_count += len(existing_ids)
            
            if not chunk_images:
                logger.info(f"[批次 {chunk_idx + 1}/{total_chunks}] 本批次所有图片已处理，跳过")
                continue
            
            # 如果强制重新处理，批量删除旧数据
            if request.force_reprocess:
                chunk_image_ids = [img[0] for img in chunk_images]
                existing_ids = check_features_exist_batch(chunk_image_ids)
                if existing_ids:
                    conn = Database.get_connection()
                    cursor = conn.cursor()
                    existing_ints = [int(img_id) for img_id in existing_ids]
                    cursor.execute("DELETE FROM tb_hsx_img_value WHERE image_id = ANY(%s)", (existing_ints,))
                    conn.commit()
                    cursor.close()
                    Database.return_connection(conn)
            
            # 过滤无效URL
            valid_chunk_images = []
            for image_id, image_url in chunk_images:
                if not image_url:
                    logger.warning(f"图片ID {image_id} 没有URL，跳过")
                    failed_count += 1
                    failed_ids.append(image_id)
                    continue
                valid_chunk_images.append((image_id, image_url))
            
            if not valid_chunk_images:
                logger.warning(f"[批次 {chunk_idx + 1}/{total_chunks}] 本批次没有有效图片")
                continue
            
            # 提取URL列表
            chunk_image_ids = [img[0] for img in valid_chunk_images]
            chunk_urls = [img[1] for img in valid_chunk_images]
            
            # 批量提取特征向量（并行下载 + 批量GPU推理）
            try:
                feature_results = extractor.extract_features_from_urls_batch(
                    chunk_urls, 
                    batch_size=settings.batch_size
                )
            except Exception as e:
                logger.error(f"[批次 {chunk_idx + 1}/{total_chunks}] 批量提取特征失败: {e}")
                # 标记本批次所有图片为失败
                for image_id in chunk_image_ids:
                    failed_count += 1
                    failed_ids.append(image_id)
                continue
            
            # 准备批量保存的数据
            batch_data = []
            for image_id, feature_vector in zip(chunk_image_ids, feature_results):
                if feature_vector is not None:
                    dimension = len(feature_vector)
                    batch_data.append((image_id, feature_vector, dimension, "MobileNetV2-GPU"))
                else:
                    failed_count += 1
                    failed_ids.append(image_id)
            
            # 批量保存到数据库
            if batch_data:
                try:
                    # 分批保存，避免单次事务过大
                    db_batch_size = settings.db_batch_size
                    saved_count_chunk = 0
                    for i in range(0, len(batch_data), db_batch_size):
                        batch = batch_data[i:i+db_batch_size]
                        try:
                            saved = save_feature_vectors_batch(batch)
                            saved_count_chunk += saved
                        except Exception as e:
                            logger.error(f"[批次 {chunk_idx + 1}/{total_chunks}] 批量保存失败（子批次 {i//db_batch_size + 1}）: {e}")
                            # 记录失败的图片ID
                            for img_id, _, _, _ in batch:
                                if img_id not in failed_ids:
                                    failed_ids.append(img_id)
                                    failed_count += 1
                    
                    success_count += saved_count_chunk
                    logger.info(f"[批次 {chunk_idx + 1}/{total_chunks}] 完成：成功 {saved_count_chunk}，失败 {len(chunk_image_ids) - saved_count_chunk}")
                except Exception as e:
                    logger.error(f"[批次 {chunk_idx + 1}/{total_chunks}] 保存到数据库失败: {e}")
                    for image_id in chunk_image_ids:
                        if image_id not in failed_ids:
                            failed_ids.append(image_id)
                            failed_count += 1
        
        message = f"处理完成：成功 {success_count}，失败 {failed_count}，跳过 {skipped_count}"
        logger.info(message)
        
        return ProcessAllImagesResponse(
            total=total_count,
            processed=len(images),
            success=success_count,
            failed=failed_count,
            skipped=skipped_count,
            failed_ids=failed_ids,
            message=message
        )
        
    except Exception as e:
        logger.error(f"处理所有图片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _process_single_image(
    image_id: str,
    image_url: str,
    extractor,
    request: ProcessAllImagesParallelRequest,
    stats_lock: Lock,
    stats: dict,
    total_images: int,
    processed_count: dict
) -> tuple:
    """处理单张图片（线程安全）
    
    Returns:
        (success, skipped, failed_id) - success为True/False，skipped为True/False，failed_id为None或图片ID
    """
    try:
        # 检查是否已存在（如果force_reprocess为False）
        if not request.force_reprocess:
            if check_feature_exists(image_id):
                with stats_lock:
                    stats['skipped'] += 1
                    processed_count['count'] += 1
                return (False, True, None)
        
        # 如果强制重新处理，先删除旧数据
        if request.force_reprocess and check_feature_exists(image_id):
            conn = Database.get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM tb_hsx_img_value WHERE image_id = %s", (int(image_id),))
            conn.commit()
            cursor.close()
            Database.return_connection(conn)
        
        # 验证URL
        if not image_url:
            with stats_lock:
                stats['failed'] += 1
                stats['failed_ids'].append(image_id)
                processed_count['count'] += 1
            return (False, False, image_id)
        
        # 提取特征向量（单张图片）
        try:
            feature_vector = extractor.extract_features_from_url(image_url)
            dimension = len(feature_vector)
        except Exception as e:
            logger.warning(f"图片 {image_id} 特征提取失败: {e}")
            with stats_lock:
                stats['failed'] += 1
                stats['failed_ids'].append(image_id)
                processed_count['count'] += 1
            return (False, False, image_id)
        
        # 保存到数据库
        try:
            save_feature_vector(
                image_id=image_id,
                feature_vector=feature_vector,
                vector_dimension=dimension,
                model_version="MobileNetV2-GPU"
            )
            
            with stats_lock:
                stats['success'] += 1
                processed_count['count'] += 1
                current_count = processed_count['count']
            
            # 每处理100张图片输出一次进度
            if current_count % 100 == 0:
                logger.info(f"进度: {current_count}/{total_images} | 成功 {stats['success']}, 失败 {stats['failed']}, 跳过 {stats['skipped']}")
            
            return (True, False, None)
            
        except Exception as e:
            logger.warning(f"图片 {image_id} 保存失败: {e}")
            with stats_lock:
                stats['failed'] += 1
                stats['failed_ids'].append(image_id)
                processed_count['count'] += 1
            return (False, False, image_id)
        
    except Exception as e:
        logger.error(f"处理图片 {image_id} 时发生异常: {e}")
        with stats_lock:
            stats['failed'] += 1
            stats['failed_ids'].append(image_id)
            processed_count['count'] += 1
        return (False, False, image_id)


@app.post("/process/all/parallel", response_model=ProcessAllImagesResponse)
async def process_all_images_parallel(request: ProcessAllImagesParallelRequest):
    """
    并行处理所有图片：使用多线程，每个线程处理一张图片，大幅提升处理速度
    
    - **limit**: 限制处理数量，None表示处理所有
    - **skip_processed**: 是否跳过已处理的图片（默认True）
    - **force_reprocess**: 是否强制重新处理（即使已存在，默认False）
    - **max_workers**: 最大线程数，None表示使用配置值（默认4）
    """
    try:
        # 获取总图片数
        total_count = get_total_image_count(skip_processed=request.skip_processed)
        
        if total_count == 0:
            return ProcessAllImagesResponse(
                total=0,
                processed=0,
                success=0,
                failed=0,
                skipped=0,
                failed_ids=[],
                message="没有需要处理的图片"
            )
        
        # 获取所有图片
        images = get_all_images(limit=request.limit, skip_processed=request.skip_processed)
        
        if not images:
            return ProcessAllImagesResponse(
                total=total_count,
                processed=0,
                success=0,
                failed=0,
                skipped=0,
                failed_ids=[],
                message="没有找到需要处理的图片"
            )
        
        logger.info(f"开始多线程并行处理 {len(images)} 张图片（总计: {total_count}）")
        
        extractor = get_feature_extractor()
        
        # 确定配置参数
        max_workers = request.max_workers if request.max_workers is not None else settings.parallel_workers
        
        logger.info(f"将使用 {max_workers} 个线程，每个线程处理一张图片")
        
        # 线程安全的统计信息
        stats_lock = Lock()
        stats = {
            'success': 0,
            'failed': 0,
            'skipped': 0,
            'failed_ids': []
        }
        
        # 处理计数器（用于进度显示）
        processed_count = {'count': 0}
        
        # 使用线程池并行处理，每个线程处理一张图片
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有图片处理任务
            futures = [
                executor.submit(
                    _process_single_image,
                    image_id,
                    image_url,
                    extractor,
                    request,
                    stats_lock,
                    stats,
                    len(images),
                    processed_count
                )
                for image_id, image_url in images
            ]
            
            # 等待所有任务完成
            completed = 0
            for future in as_completed(futures):
                try:
                    future.result()  # 获取结果（结果已在函数内部更新统计信息）
                    completed += 1
                except Exception as e:
                    logger.error(f"处理任务异常: {e}")
                    completed += 1
        
        message = f"并行处理完成：成功 {stats['success']}，失败 {stats['failed']}，跳过 {stats['skipped']}"
        logger.info(message)
        
        return ProcessAllImagesResponse(
            total=total_count,
            processed=len(images),
            success=stats['success'],
            failed=stats['failed'],
            skipped=stats['skipped'],
            failed_ids=stats['failed_ids'],
            message=message
        )
        
    except Exception as e:
        logger.error(f"并行处理所有图片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
        log_level="info"
    )
