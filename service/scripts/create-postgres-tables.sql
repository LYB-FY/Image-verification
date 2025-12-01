-- PostgreSQL 数据库表结构
-- 创建图片表
CREATE TABLE IF NOT EXISTS tb_image (
  id BIGINT NOT NULL PRIMARY KEY,
  md5 VARCHAR(32) NOT NULL,
  url VARCHAR(500) NOT NULL,
  file_type SMALLINT NOT NULL DEFAULT 0,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_image_md5 UNIQUE (md5)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_image_create_time ON tb_image(create_time);
CREATE INDEX IF NOT EXISTS idx_image_file_type ON tb_image(file_type);

-- 创建图片特征向量表
CREATE TABLE IF NOT EXISTS tb_hsx_img_value (
  id BIGSERIAL PRIMARY KEY,
  image_id BIGINT NOT NULL,
  feature_vector JSONB NOT NULL,
  vector_dimension INTEGER NOT NULL DEFAULT 1280,
  model_version VARCHAR(50) DEFAULT 'MobileNetV2',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_image_id UNIQUE (image_id),
  CONSTRAINT fk_image_id FOREIGN KEY (image_id) REFERENCES tb_image(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_hsx_img_value_image_id ON tb_hsx_img_value(image_id);

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
COMMENT ON TABLE tb_image IS '图片信息表';
COMMENT ON TABLE tb_hsx_img_value IS '图片特征向量表';
COMMENT ON COLUMN tb_image.id IS '主键ID';
COMMENT ON COLUMN tb_image.md5 IS '图片MD5值';
COMMENT ON COLUMN tb_image.url IS '图片URL';
COMMENT ON COLUMN tb_image.file_type IS '文件类型：1-PNG, 2-JPG, 3-GIF, 4-WEBP';
COMMENT ON COLUMN tb_hsx_img_value.id IS '主键ID';
COMMENT ON COLUMN tb_hsx_img_value.image_id IS '关联的图片ID，对应tb_image表的id';
COMMENT ON COLUMN tb_hsx_img_value.feature_vector IS 'MobileNetV2计算的特征向量（1280维）';
COMMENT ON COLUMN tb_hsx_img_value.vector_dimension IS '特征向量维度';
COMMENT ON COLUMN tb_hsx_img_value.model_version IS '使用的模型版本';
