import axios from "axios";
import { createDbConnection } from "../app/utils/db.js";
import { Client } from "pg";

const BASE_URL = "http://localhost:7001";

// 从数据库获取一个真实的图片 ID
async function getImageIdFromDatabase(): Promise<string | null> {
  let client: Client | undefined;
  try {
    client = await createDbConnection();

    // PostgreSQL 使用 ::text 转换
    const result = await client.query(
      "SELECT id::text as id FROM ecai.tb_image ORDER BY id DESC LIMIT 1"
    );

    if (result.rows.length > 0) {
      // id 已经是字符串，直接返回
      return String(result.rows[0].id);
    }
    return null;
  } catch (error) {
    console.warn("⚠️  无法从数据库获取图片 ID:", (error as Error).message);
    return null;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

interface TestResult {
  name: string;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
}

async function testEndpoint(
  name: string,
  method: "GET" | "POST",
  url: string,
  data?: any
): Promise<TestResult> {
  try {
    let response;
    if (method === "GET") {
      response = await axios.get(url);
    } else {
      response = await axios.post(url, data);
    }

    return {
      name,
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error: any) {
    if (error.response) {
      return {
        name,
        success: false,
        status: error.response.status,
        error: error.response.data || error.message,
      };
    } else if (error.request) {
      return {
        name,
        success: false,
        error: `无法连接到服务器: ${error.message}`,
      };
    } else {
      return {
        name,
        success: false,
        error: error.message,
      };
    }
  }
}

function printResult(result: TestResult) {
  const icon = result.success ? "✅" : "❌";
  console.log(`\n${icon} ${result.name}`);
  console.log(`   方法: ${result.status ? "HTTP " + result.status : "N/A"}`);

  if (result.success) {
    console.log(`   响应数据:`);
    console.log(
      JSON.stringify(result.data, null, 6)
        .split("\n")
        .map((line) => `   ${line}`)
        .join("\n")
    );
  } else {
    console.log(`   错误: ${JSON.stringify(result.error)}`);
  }
}

async function testAPI() {
  console.log("🧪 开始测试所有接口...");
  console.log(`📍 服务地址: ${BASE_URL}\n`);
  console.log("=".repeat(60));

  // 先从数据库获取一个真实的图片 ID
  console.log("\n🔍 正在从数据库获取图片 ID...");
  const testImageId = await getImageIdFromDatabase();
  if (testImageId) {
    console.log(`✅ 获取到图片 ID: ${testImageId}\n`);
  } else {
    console.log("⚠️  未找到图片 ID，将使用默认值进行测试\n");
  }

  const results: TestResult[] = [];

  // 1. 测试根路径
  console.log("\n📋 测试 1: 根路径接口");
  const result1 = await testEndpoint("GET / - 根路径", "GET", `${BASE_URL}/`);
  results.push(result1);
  printResult(result1);

  // 2. 测试用户接口
  console.log("\n📋 测试 2: 用户接口");
  const result2 = await testEndpoint(
    "GET /bar/user - 用户查询",
    "GET",
    `${BASE_URL}/bar/user?userId=test123`
  );
  results.push(result2);
  printResult(result2);

  // 3. 测试图片特征查询接口
  if (testImageId) {
    console.log("\n📋 测试 3: 图片特征查询接口");
    const result3 = await testEndpoint(
      `GET /api/image-feature/query - 查询图片特征 (imageId: ${testImageId})`,
      "GET",
      `${BASE_URL}/api/image-feature/query?imageId=${testImageId}`
    );
    results.push(result3);
    printResult(result3);

    // 4. 测试单个图片处理接口
    console.log("\n📋 测试 4: 单个图片处理接口");
    const result4 = await testEndpoint(
      `POST /api/image-feature/process - 处理单个图片 (imageId: ${testImageId})`,
      "POST",
      `${BASE_URL}/api/image-feature/process`,
      { imageId: testImageId }
    );
    results.push(result4);
    printResult(result4);
  } else {
    console.log("\n⚠️  跳过图片相关测试（未找到图片 ID）");
    console.log("   提示: 请先运行 npm run import-images 导入图片");
  }

  // 5. 测试批量处理接口
  console.log("\n📋 测试 5: 批量处理接口");
  const result5 = await testEndpoint(
    "POST /api/image-feature/batch-process - 批量处理图片 (limit: 1)",
    "POST",
    `${BASE_URL}/api/image-feature/batch-process`,
    { limit: 1 }
  );
  results.push(result5);
  printResult(result5);

  // 6. 测试批量处理接口（不传 limit）
  console.log("\n📋 测试 6: 批量处理接口（默认 limit）");
  const result6 = await testEndpoint(
    "POST /api/image-feature/batch-process - 批量处理图片 (默认 limit)",
    "POST",
    `${BASE_URL}/api/image-feature/batch-process`,
    {}
  );
  results.push(result6);
  printResult(result6);

  // 7. 测试相似度计算接口（默认阈值）
  console.log("\n📋 测试 7: 相似度计算接口（默认阈值 90%）");
  const result7 = await testEndpoint(
    "GET /api/image-feature/similar - 批量计算相似度 (默认阈值)",
    "GET",
    `${BASE_URL}/api/image-feature/similar`
  );
  results.push(result7);
  printResult(result7);

  // 8. 测试相似度计算接口（自定义阈值）
  console.log("\n📋 测试 8: 相似度计算接口（自定义阈值 85%）");
  const result8 = await testEndpoint(
    "GET /api/image-feature/similar - 批量计算相似度 (阈值: 0.85)",
    "GET",
    `${BASE_URL}/api/image-feature/similar?threshold=0.85`
  );
  results.push(result8);
  printResult(result8);

  // 9. 测试相似度计算接口（无效阈值）
  console.log("\n📋 测试 9: 相似度计算接口（无效阈值验证）");
  const result9 = await testEndpoint(
    "GET /api/image-feature/similar - 批量计算相似度 (无效阈值: 1.5)",
    "GET",
    `${BASE_URL}/api/image-feature/similar?threshold=1.5`
  );
  results.push(result9);
  printResult(result9);

  // 汇总结果
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 测试结果汇总:");
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  console.log(`   总计: ${results.length} 个接口`);
  console.log(`   ✅ 成功: ${successCount} 个`);
  console.log(`   ❌ 失败: ${failCount} 个`);

  if (failCount > 0) {
    console.log("\n❌ 失败的接口:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
  }

  console.log("\n" + "=".repeat(60));
  console.log(
    failCount === 0
      ? "🎉 所有测试通过！"
      : "⚠️  部分测试失败，请检查上述错误信息"
  );
}

testAPI().catch((error) => {
  console.error("\n❌ 测试脚本执行失败:", error.message);
  process.exit(1);
});
