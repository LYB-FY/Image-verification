import {
  createPostgresConnection,
  getPostgresConfig,
} from "../app/utils/db.js";

/**
 * 读取并显示 PostgreSQL 数据库结构
 */
async function readPostgresSchema() {
  let client;
  try {
    console.log("正在连接 PostgreSQL 数据库...");
    const config = getPostgresConfig();
    console.log(
      `连接信息: ${config.host}:${config.port}, 数据库: ${config.database}, 用户: ${config.user}\n`
    );

    client = await createPostgresConnection();

    console.log("✅ PostgreSQL 数据库连接成功！\n");

    // 获取 PostgreSQL 版本
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

    // 获取所有表（从 ecai 模式）
    const schemaName = "ecai";
    const tablesResult = await client.query(
      `
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name
    `,
      [schemaName]
    );

    console.log(
      `📊 数据库 '${config.database}' 的模式 '${schemaName}' 中共有 ${tablesResult.rows.length} 个表：\n`
    );

    if (tablesResult.rows.length === 0) {
      console.log("⚠️  数据库中没有表");
      return;
    }

    // 遍历每个表，获取详细信息
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;
      console.log("\n" + "=".repeat(80));
      console.log(`📋 表名: ${schemaName}.${tableName}`);
      console.log(`   类型: ${tableRow.table_type}`);
      console.log("─".repeat(80));

      // 获取表的列信息
      const columnsResult = await client.query(
        `
        SELECT 
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `,
        [schemaName, tableName]
      );

      console.log("\n列信息：");
      console.log(
        "  列名".padEnd(25) +
          "类型".padEnd(25) +
          "可空".padEnd(8) +
          "默认值".padEnd(20) +
          "长度/精度"
      );
      console.log("  " + "─".repeat(100));

      for (const column of columnsResult.rows) {
        let typeInfo = column.udt_name || column.data_type;
        if (column.character_maximum_length) {
          typeInfo += `(${column.character_maximum_length})`;
        } else if (column.numeric_precision) {
          typeInfo += `(${column.numeric_precision}`;
          if (column.numeric_scale) {
            typeInfo += `,${column.numeric_scale}`;
          }
          typeInfo += ")";
        }

        const defaultValue = column.column_default
          ? column.column_default.substring(0, 18)
          : "NULL";
        const lengthInfo = column.character_maximum_length
          ? String(column.character_maximum_length)
          : column.numeric_precision
          ? `${column.numeric_precision}${
              column.numeric_scale ? "," + column.numeric_scale : ""
            }`
          : "";

        console.log(
          `  ${column.column_name.padEnd(23)}${typeInfo.padEnd(
            23
          )}${column.is_nullable.padEnd(6)}${defaultValue.padEnd(
            18
          )}${lengthInfo}`
        );
      }

      // 获取主键信息
      const primaryKeyResult = await client.query(
        `
        SELECT 
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY kcu.ordinal_position
      `,
        [schemaName, tableName]
      );

      if (primaryKeyResult.rows.length > 0) {
        console.log("\n主键：");
        const pkColumns = primaryKeyResult.rows.map((r) => r.column_name);
        console.log(`  ${pkColumns.join(", ")}`);
      }

      // 获取唯一约束信息
      const uniqueResult = await client.query(
        `
        SELECT 
          tc.constraint_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY tc.constraint_name, kcu.ordinal_position
      `,
        [schemaName, tableName]
      );

      if (uniqueResult.rows.length > 0) {
        console.log("\n唯一约束：");
        const uniqueMap = new Map<string, string[]>();
        for (const row of uniqueResult.rows) {
          if (!uniqueMap.has(row.constraint_name)) {
            uniqueMap.set(row.constraint_name, []);
          }
          uniqueMap.get(row.constraint_name)!.push(row.column_name);
        }
        for (const [constraintName, columns] of uniqueMap) {
          console.log(`  ${constraintName}: ${columns.join(", ")}`);
        }
      }

      // 获取外键信息
      const foreignKeyResult = await client.query(
        `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule,
          rc.update_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
          AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY tc.constraint_name, kcu.ordinal_position
      `,
        [schemaName, tableName]
      );

      if (foreignKeyResult.rows.length > 0) {
        console.log("\n外键：");
        const fkMap = new Map<string, any[]>();
        for (const row of foreignKeyResult.rows) {
          if (!fkMap.has(row.constraint_name)) {
            fkMap.set(row.constraint_name, []);
          }
          fkMap.get(row.constraint_name)!.push(row);
        }
        for (const [constraintName, rows] of fkMap) {
          const columns = rows.map((r) => r.column_name).join(", ");
          const refTable = rows[0].foreign_table_name;
          const refColumns = rows.map((r) => r.foreign_column_name).join(", ");
          const deleteRule = rows[0].delete_rule;
          const updateRule = rows[0].update_rule;
          console.log(
            `  ${constraintName}: (${columns}) -> ${refTable}(${refColumns})`
          );
          console.log(`    ON DELETE: ${deleteRule}, ON UPDATE: ${updateRule}`);
        }
      }

      // 获取索引信息
      const indexesResult = await client.query(
        `
        SELECT
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
        ORDER BY i.relname, array_position(ix.indkey, a.attnum)
      `,
        [schemaName, tableName]
      );

      if (indexesResult.rows.length > 0) {
        console.log("\n索引：");
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

    console.log("\n" + "=".repeat(80));
    console.log("✅ 数据库结构读取完成！");
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

readPostgresSchema().catch(console.error);
