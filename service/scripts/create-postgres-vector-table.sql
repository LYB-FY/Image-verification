-- PostgreSQL 向量表结构（使用 pgvector 扩展）
-- 注意：tb_image 表在 ecai 模式中，只包含 id 和 url 字段

-- 启用 pgvector 扩展（如果未安装，需要先安装：CREATE EXTENSION IF NOT EXISTS vector;）
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建图片特征向量表（在 public 模式中）
CREATE TABLE IF NOT EXISTS tb_hsx_img_value (
  id BIGSERIAL PRIMARY KEY,
  image_id BIGINT NOT NULL,
  feature_vector vector(1280) NOT NULL,  -- 使用 vector 类型，1280 维
  vector_dimension INTEGER NOT NULL DEFAULT 1280,
  model_version VARCHAR(50) DEFAULT 'MobileNetV2',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_image_id UNIQUE (image_id),
  CONSTRAINT fk_image_id FOREIGN KEY (image_id) REFERENCES ecai.tb_image(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_hsx_img_value_image_id ON tb_hsx_img_value(image_id);

-- 创建向量相似度搜索索引（使用 HNSW 算法，适合高维向量）
-- 注意：HNSW 索引需要 pgvector >= 0.5.0
CREATE INDEX IF NOT EXISTS idx_hsx_img_value_vector_hnsw 
ON tb_hsx_img_value 
USING hnsw (feature_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 如果 HNSW 不支持，可以使用 ivfflat 索引（需要先有数据）
-- CREATE INDEX IF NOT EXISTS idx_hsx_img_value_vector_ivfflat 
-- ON tb_hsx_img_value 
-- USING ivfflat (feature_vector vector_cosine_ops)
-- WITH (lists = 100);

-- 创建更新时间的触发器函数
CREATE OR REPLACE FUNCTION update_updated_time_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.update_time = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，自动更新 update_time
DROP TRIGGER IF EXISTS update_tb_hsx_img_value_updated_time ON tb_hsx_img_value;
CREATE TRIGGER update_tb_hsx_img_value_updated_time
  BEFORE UPDATE ON tb_hsx_img_value
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_time_column();

-- 添加表注释
COMMENT ON TABLE tb_hsx_img_value IS '图片特征向量表（使用 vector 类型）';
COMMENT ON COLUMN tb_hsx_img_value.id IS '主键ID';
COMMENT ON COLUMN tb_hsx_img_value.image_id IS '关联的图片ID，对应 ecai.tb_image 表的 id';
COMMENT ON COLUMN tb_hsx_img_value.feature_vector IS 'MobileNetV2计算的特征向量（1280维，使用 vector 类型）';
COMMENT ON COLUMN tb_hsx_img_value.vector_dimension IS '特征向量维度';
COMMENT ON COLUMN tb_hsx_img_value.model_version IS '使用的模型版本';
