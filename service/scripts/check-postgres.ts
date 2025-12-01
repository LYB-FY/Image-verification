import {
  createPostgresConnection,
  getPostgresConfig,
} from "../app/utils/db.js";

async function checkPostgresDatabase() {
  let client;
  try {
    console.log("正在连接 PostgreSQL 数据库...");
    const config = getPostgresConfig();
    console.log(
      `连接信息: ${config.host}:${config.port}, 数据库: ${config.database}, 用户: ${config.user}\n`
    );

    client = await createPostgresConnection();

    console.log("✅ PostgreSQL 数据库连接成功！\n");

    // 测试基本查询
    const versionResult = await client.query("SELECT version()");
    console.log("📊 PostgreSQL 版本信息:");
    console.log(`   ${versionResult.rows[0].version}\n`);

    // 获取当前数据库信息
    const dbInfoResult = await client.query(
      "SELECT current_database(), current_user, inet_server_addr(), inet_server_port()"
    );
    const dbInfo = dbInfoResult.rows[0];
    console.log("📋 当前数据库信息:");
    console.log(`   数据库名: ${dbInfo.current_database}`);
    console.log(`   当前用户: ${dbInfo.current_user}`);
    console.log(`   服务器地址: ${dbInfo.inet_server_addr || "N/A"}`);
    console.log(`   服务器端口: ${dbInfo.inet_server_port || "N/A"}\n`);

    // 获取所有表
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(
      `📊 数据库 '${config.database}' 中共有 ${tablesResult.rows.length} 个表：\n`
    );

    // 遍历每个表，获取表结构
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      console.log(`\n📋 表名: ${tableName}`);
      console.log("─".repeat(50));

      // 获取表的列信息
      const columnsResult = await client.query(
        `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `,
        [tableName]
      );

      console.log("列信息：");
      console.log("  列名\t\t类型\t\t可空\t默认值\t\t长度/精度");
      console.log("  " + "─".repeat(80));

      for (const column of columnsResult.rows) {
        let typeInfo = column.data_type;
        if (column.character_maximum_length) {
          typeInfo += `(${column.character_maximum_length})`;
        } else if (column.numeric_precision) {
          typeInfo += `(${column.numeric_precision}`;
          if (column.numeric_scale) {
            typeInfo += `,${column.numeric_scale}`;
          }
          typeInfo += ")";
        }

        console.log(
          `  ${column.column_name.padEnd(15)}\t${typeInfo.padEnd(15)}\t${
            column.is_nullable
          }\t${column.column_default || "NULL"}\t${
            column.character_maximum_length || column.numeric_precision || ""
          }`
        );
      }

      // 获取表的索引信息
      const indexesResult = await client.query(
        `
        SELECT 
          i.indexname,
          i.indexdef,
          a.attname as column_name
        FROM pg_indexes i
        LEFT JOIN pg_class c ON c.relname = i.tablename
        LEFT JOIN pg_index idx ON idx.indexrelid = (
          SELECT oid FROM pg_class WHERE relname = i.indexname
        )
        LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(idx.indkey)
        WHERE i.schemaname = 'public' AND i.tablename = $1
        ORDER BY i.indexname, a.attnum
      `,
        [tableName]
      );

      if (indexesResult.rows.length > 0) {
        console.log("\n索引信息：");
        const indexMap = new Map<string, string[]>();
        for (const index of indexesResult.rows) {
          if (index.indexname && index.column_name) {
            if (!indexMap.has(index.indexname)) {
              indexMap.set(index.indexname, []);
            }
            if (!indexMap.get(index.indexname)!.includes(index.column_name)) {
              indexMap.get(index.indexname)!.push(index.column_name);
            }
          }
        }
        for (const [indexName, columns] of indexMap) {
          const indexDef =
            indexesResult.rows.find((i) => i.indexname === indexName)
              ?.indexdef || "";
          const isUnique = indexDef.includes("UNIQUE") ? "UNIQUE" : "";
          console.log(`  ${indexName} ${isUnique}: ${columns.join(", ")}`);
        }
      }
    }

    console.log("\n✅ PostgreSQL 数据库检查完成！");
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

checkPostgresDatabase().catch(console.error);
