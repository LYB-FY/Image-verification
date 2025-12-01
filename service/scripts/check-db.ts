import {
  createPostgresConnection,
  getPostgresConfig,
} from "../app/utils/db.js";

/**
 * 检查 PostgreSQL 数据库连接和表结构
 * 注意：此脚本已更新为使用 PostgreSQL，如需检查 MySQL，请使用 check-mysql.ts
 */
async function checkDatabase() {
  let client;
  try {
    console.log("正在连接 PostgreSQL 数据库...");
    const config = getPostgresConfig();
    console.log(
      `连接信息: ${config.host}:${config.port}, 数据库: ${config.database}, 用户: ${config.user}\n`
    );

    client = await createPostgresConnection();

    console.log("✅ PostgreSQL 数据库连接成功！\n");

    // 查询所有模式（schema）
    const schemasResult = await client.query(
      `SELECT schema_name 
       FROM information_schema.schemata 
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       ORDER BY schema_name`
    );

    console.log(`📊 数据库 '${config.database}' 中的模式：\n`);
    for (const schema of schemasResult.rows) {
      console.log(`  - ${schema.schema_name}`);
    }

    // 获取所有表（包括所有模式）
    const tablesResult = await client.query(
      `SELECT 
        table_schema,
        table_name 
       FROM information_schema.tables 
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name`
    );

    console.log(`\n📊 共有 ${tablesResult.rows.length} 个表：\n`);

    // 遍历每个表，获取表结构
    for (const table of tablesResult.rows) {
      const schemaName = table.table_schema;
      const tableName = table.table_name;
      console.log(`\n📋 表名: ${schemaName}.${tableName}`);
      console.log("─".repeat(50));

      // 获取表的列信息
      const columnsResult = await client.query(
        `SELECT 
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position`,
        [schemaName, tableName]
      );

      console.log("列信息：");
      console.log(
        "  列名".padEnd(25) +
          "类型".padEnd(20) +
          "可空".padEnd(8) +
          "默认值".padEnd(20) +
          "长度"
      );
      console.log("  " + "─".repeat(80));

      for (const column of columnsResult.rows) {
        const typeInfo = column.udt_name || column.data_type;
        const maxLength = column.character_maximum_length || "";
        console.log(
          `  ${column.column_name.padEnd(23)}${typeInfo.padEnd(
            18
          )}${column.is_nullable.padEnd(6)}${(column.column_default || "NULL")
            .substring(0, 18)
            .padEnd(18)}${maxLength}`
        );
      }

      // 获取表的索引信息
      const indexesResult = await client.query(
        `SELECT
          i.relname AS index_name,
          a.attname AS column_name,
          ix.indisunique AS is_unique,
          ix.indisprimary AS is_primary,
          am.amname AS index_type
        FROM pg_class t
        JOIN pg_namespace n ON t.relnamespace = n.oid
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_am am ON i.relam = am.oid
        LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relkind = 'r'
          AND n.nspname = $1
          AND t.relname = $2
        ORDER BY i.relname, array_position(ix.indkey, a.attnum)`,
        [schemaName, tableName]
      );

      if (indexesResult.rows.length > 0) {
        console.log("\n索引信息：");
        const indexMap = new Map<string, any[]>();
        for (const row of indexesResult.rows) {
          if (!indexMap.has(row.index_name)) {
            indexMap.set(row.index_name, []);
          }
          indexMap.get(row.index_name)!.push(row);
        }
        for (const [indexName, rows] of indexMap) {
          const columns = rows
            .map((r) => r.column_name)
            .filter((c) => c)
            .join(", ");
          const firstRow = rows[0];
          const typeInfo = firstRow.is_primary
            ? "PRIMARY KEY"
            : firstRow.is_unique
            ? "UNIQUE"
            : firstRow.index_type || "";
          console.log(`  ${indexName} (${typeInfo}): ${columns}`);
        }
      }

      // 获取表的行数
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM ${schemaName}.${tableName}`
      );
      console.log(`\n行数: ${countResult.rows[0].count}`);
    }

    console.log("\n✅ 表结构读取完成！");
  } catch (error: any) {
    console.error("❌ PostgreSQL 数据库连接或查询错误:");
    if (error.code) {
      console.error(`  错误代码: ${error.code}`);
    }
    if (error.message) {
      console.error(`  错误信息: ${error.message}`);
    }
    if (error.hint) {
      console.error(`  提示: ${error.hint}`);
    }
    console.error("\n完整错误信息:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

checkDatabase().catch(console.error);
