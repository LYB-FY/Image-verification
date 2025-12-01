/**
 * 数据库连接工具类
 * 统一管理数据库连接配置
 */
import mysql from "mysql2/promise";
import { Pool, Client, PoolConfig, ClientConfig } from "pg";

// MySQL 数据库配置接口
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

// PostgreSQL 数据库配置接口
export interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
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
 * 创建 MySQL 数据库连接（保留用于向后兼容）
 * @param config 可选的数据库配置，不传则使用默认配置
 * @returns MySQL 连接对象
 */
export async function createMySQLConnection(
  config?: Partial<DbConfig>
): Promise<mysql.Connection> {
  const dbConfig = {
    ...getDbConfig(),
    ...config,
  };

  return await mysql.createConnection(dbConfig);
}

/**
 * 创建 MySQL 数据库连接池（保留用于向后兼容）
 * @param config 可选的数据库配置，不传则使用默认配置
 * @returns MySQL 连接池对象
 */
export function createMySQLPool(config?: Partial<DbConfig>): mysql.Pool {
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

// PostgreSQL 默认配置
const defaultPostgresConfig: PostgresConfig = {
  host: "47.96.138.112",
  port: 15432,
  user: "postgres",
  password: "EerwkVA@m-e9*CNW",
  database: "postgres",
};

// 从环境变量或配置文件获取 PostgreSQL 配置
export function getPostgresConfig(): PostgresConfig {
  // 优先使用环境变量
  if (process.env.PG_HOST) {
    return {
      host: process.env.PG_HOST || defaultPostgresConfig.host,
      port: parseInt(process.env.PG_PORT || String(defaultPostgresConfig.port)),
      user: process.env.PG_USER || defaultPostgresConfig.user,
      password: process.env.PG_PASSWORD || defaultPostgresConfig.password,
      database: process.env.PG_DATABASE || defaultPostgresConfig.database,
    };
  }

  // 尝试从 Egg 配置中获取
  try {
    // 在 Egg 应用中运行时
    // @ts-ignore
    if (global.app?.config?.postgres) {
      // @ts-ignore
      return global.app.config.postgres;
    }
  } catch (error) {
    // 忽略错误，使用默认配置
  }

  // 使用默认配置
  return defaultPostgresConfig;
}

/**
 * 创建 PostgreSQL 连接
 * @param config 可选的 PostgreSQL 配置，不传则使用默认配置
 * @returns PostgreSQL 客户端对象
 */
export async function createPostgresConnection(
  config?: Partial<PostgresConfig>
): Promise<Client> {
  const pgConfig: ClientConfig = {
    ...getPostgresConfig(),
    ...config,
  };

  const client = new Client(pgConfig);
  await client.connect();
  return client;
}

/**
 * 创建 PostgreSQL 连接池
 * @param config 可选的 PostgreSQL 配置，不传则使用默认配置
 * @returns PostgreSQL 连接池对象
 */
export function createPostgresPool(config?: Partial<PostgresConfig>): Pool {
  const pgConfig: PoolConfig = {
    ...getPostgresConfig(),
    ...config,
    max: 20, // 最大连接数
    idleTimeoutMillis: 30000, // 空闲连接超时时间
    connectionTimeoutMillis: 2000, // 连接超时时间
  };

  return new Pool(pgConfig);
}

/**
 * 创建数据库连接（统一接口，默认使用 PostgreSQL）
 * @param config 可选的数据库配置，不传则使用 PostgreSQL 默认配置
 * @returns PostgreSQL 客户端对象
 */
export async function createDbConnection(
  config?: Partial<PostgresConfig>
): Promise<Client> {
  return createPostgresConnection(config);
}

/**
 * 创建数据库连接池（统一接口，默认使用 PostgreSQL）
 * @param config 可选的数据库配置，不传则使用 PostgreSQL 默认配置
 * @returns PostgreSQL 连接池对象
 */
export function createDbPool(config?: Partial<PostgresConfig>): Pool {
  return createPostgresPool(config);
}

// 导出配置供其他模块使用
export { defaultConfig, defaultPostgresConfig };
