-- 创建图片特征向量表
CREATE TABLE IF NOT EXISTS `tb_hsx_img_value` (
  `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  `image_id` BIGINT NOT NULL COMMENT '关联的图片ID，对应tb_image表的id',
  `feature_vector` JSON NOT NULL COMMENT 'MobileNetV2计算的特征向量（1280维）',
  `vector_dimension` INT NOT NULL DEFAULT 1280 COMMENT '特征向量维度',
  `model_version` VARCHAR(50) DEFAULT 'MobileNetV2' COMMENT '使用的模型版本',
  `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_image_id` (`image_id`),
  UNIQUE KEY `uk_image_id` (`image_id`),
  FOREIGN KEY (`image_id`) REFERENCES `tb_image`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图片特征向量表';
