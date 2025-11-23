/**
 * 数据库连接工具类
 * 统一管理数据库连接配置
 */
import mysql from "mysql2/promise";

// 数据库配置接口
export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  supportBigNumbers?: boolean;
  bigNumberStrings?: boolean;
  charset?: string;
}

// 默认数据库配置
const defaultConfig: DbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "root",
  database: "demo",
  supportBigNumbers: true,
  bigNumberStrings: true,
  charset: "utf8mb4",
};

// 从环境变量或配置文件获取数据库配置
export function getDbConfig(): DbConfig {
  // 优先使用环境变量
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST || defaultConfig.host,
      port: parseInt(process.env.DB_PORT || String(defaultConfig.port)),
      user: process.env.DB_USER || defaultConfig.user,
      password: process.env.DB_PASSWORD || defaultConfig.password,
      database: process.env.DB_DATABASE || defaultConfig.database,
      supportBigNumbers: true,
      bigNumberStrings: true,
      charset: "utf8mb4",
    };
  }

  // 尝试从 Egg 配置中获取
  try {
    // 在 Egg 应用中运行时
    // @ts-ignore
    if (global.app?.config?.mysql) {
      // @ts-ignore
      return global.app.config.mysql;
    }
  } catch (error) {
    // 忽略错误，使用默认配置
  }

  // 使用默认配置
  return defaultConfig;
}

/**
 * 创建数据库连接
 * @param config 可选的数据库配置，不传则使用默认配置
 * @returns MySQL 连接对象
 */
export async function createDbConnection(
  config?: Partial<DbConfig>
): Promise<mysql.Connection> {
  const dbConfig = {
    ...getDbConfig(),
    ...config,
  };

  return await mysql.createConnection(dbConfig);
}

/**
 * 创建数据库连接池
 * @param config 可选的数据库配置，不传则使用默认配置
 * @returns MySQL 连接池对象
 */
export function createDbPool(config?: Partial<DbConfig>): mysql.Pool {
  const dbConfig = {
    ...getDbConfig(),
    ...config,
  };

  return mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

// 导出配置供其他模块使用
export { defaultConfig };
