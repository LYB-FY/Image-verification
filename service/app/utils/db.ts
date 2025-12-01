/**
 * PostgreSQL 数据库连接工具类
 * 统一管理数据库连接配置
 */
import { Pool, Client, PoolConfig, ClientConfig } from "pg";

// PostgreSQL 数据库配置接口
export interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// PostgreSQL 默认配置
const defaultPostgresConfig: PostgresConfig = {
  host: "47.96.138.112",
  port: 15432,
  user: "postgres",
  password: "EerwkVA@m-e9*CNW",
  database: "postgres",
};

/**
 * 从环境变量或配置文件获取 PostgreSQL 配置
 * @returns PostgreSQL 配置对象
 */
export function getPostgresConfig(): PostgresConfig {
  // 优先使用环境变量
  if (process.env.POSTGRES_HOST || process.env.PG_HOST) {
    return {
      host:
        process.env.POSTGRES_HOST ||
        process.env.PG_HOST ||
        defaultPostgresConfig.host,
      port: parseInt(
        process.env.POSTGRES_PORT ||
          process.env.PG_PORT ||
          String(defaultPostgresConfig.port)
      ),
      user:
        process.env.POSTGRES_USER ||
        process.env.PG_USER ||
        defaultPostgresConfig.user,
      password:
        process.env.POSTGRES_PASSWORD ||
        process.env.PG_PASSWORD ||
        defaultPostgresConfig.password,
      database:
        process.env.POSTGRES_DATABASE ||
        process.env.PG_DATABASE ||
        defaultPostgresConfig.database,
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
 * 创建数据库连接（PostgreSQL）
 * @param config 可选的 PostgreSQL 配置
 * @returns PostgreSQL 连接对象
 */
export async function createDbConnection(
  config?: Partial<PostgresConfig>
): Promise<Client> {
  return await createPostgresConnection(config);
}

/**
 * 创建数据库连接池（PostgreSQL）
 * @param config 可选的 PostgreSQL 配置
 * @returns PostgreSQL 连接池对象
 */
export function createDbPool(config?: Partial<PostgresConfig>): Pool {
  return createPostgresPool(config);
}

// 导出默认配置供其他模块使用
export { defaultPostgresConfig };
