import axios from "axios";
import { createDbConnection } from "../app/utils/db.js";
import mysql from "mysql2/promise";

const API_BASE_URL = "http://127.0.0.1:7001/api/image-feature";

// 测试结果接口
interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

// 从数据库获取一个图片ID
async function getImageIdFromDatabase(): Promise<string | null> {
  let connection;
  try {
    connection = await createDbConnection();
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT CAST(image_id AS CHAR) as image_id FROM tb_hsx_img_value LIMIT 1"
    );

    if (rows.length > 0) {
      return rows[0].image_id;
    }
    return null;
  } catch (error) {
    console.error("从数据库获取图片ID失败:", error);
    return null;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 从数据库获取一个图片URL
async function getImageUrlFromDatabase(): Promise<string | null> {
  let connection;
  try {
    connection = await createDbConnection();
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT i.url FROM tb_image i INNER JOIN tb_hsx_img_value f ON CAST(i.id AS CHAR) = CAST(f.image_id AS CHAR) LIMIT 1"
    );

    if (rows.length > 0) {
      return rows[0].url;
    }
    return null;
  } catch (error) {
    console.error("从数据库获取图片URL失败:", error);
    return null;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 测试：通过图片ID搜索相似图片
async function testSearchByImageId(imageId: string): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试：通过图片ID搜索相似图片 (ID: ${imageId})`);
    const response = await axios.get(`${API_BASE_URL}/search-by-id-or-url`, {
      params: {
        imageId,
        threshold: 0.8,
      },
    });

    const result = response.data;

    if (result.success) {
      console.log(`✅ 成功！找到 ${result.data.count} 张相似图片`);
      if (result.data.images.length > 0) {
        console.log(`   示例结果：`);
        result.data.images.slice(0, 3).forEach((img: any) => {
          console.log(
            `   - ID: ${img.imageId}, 相似度: ${img.similarity}%, URL: ${img.url}`
          );
        });
      }
      return {
        test: "通过图片ID搜索",
        success: true,
        message: result.message,
        data: result.data,
      };
    } else {
      console.log(`❌ 失败：${result.message}`);
      return {
        test: "通过图片ID搜索",
        success: false,
        message: result.message,
      };
    }
  } catch (error: any) {
    console.log(`❌ 错误：${error.message}`);
    return {
      test: "通过图片ID搜索",
      success: false,
      message: error.message,
    };
  }
}

// 测试：通过图片URL搜索相似图片
async function testSearchByImageUrl(imageUrl: string): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试：通过图片URL搜索相似图片`);
    console.log(`   URL: ${imageUrl}`);
    const response = await axios.get(`${API_BASE_URL}/search-by-id-or-url`, {
      params: {
        imageUrl,
        threshold: 0.8,
      },
    });

    const result = response.data;

    if (result.success) {
      console.log(`✅ 成功！找到 ${result.data.count} 张相似图片`);
      if (result.data.images.length > 0) {
        console.log(`   示例结果：`);
        result.data.images.slice(0, 3).forEach((img: any) => {
          console.log(
            `   - ID: ${img.imageId}, 相似度: ${img.similarity}%, URL: ${img.url}`
          );
        });
      }
      return {
        test: "通过图片URL搜索",
        success: true,
        message: result.message,
        data: result.data,
      };
    } else {
      console.log(`❌ 失败：${result.message}`);
      return {
        test: "通过图片URL搜索",
        success: false,
        message: result.message,
      };
    }
  } catch (error: any) {
    console.log(`❌ 错误：${error.message}`);
    return {
      test: "通过图片URL搜索",
      success: false,
      message: error.message,
    };
  }
}

// 测试：参数验证
async function testParameterValidation(): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试：参数验证（不提供任何参数）`);
    const response = await axios.get(`${API_BASE_URL}/search-by-id-or-url`, {
      params: {
        threshold: 0.8,
      },
    });

    const result = response.data;

    if (!result.success && result.message.includes("imageId 或 imageUrl")) {
      console.log(`✅ 参数验证正常！错误信息：${result.message}`);
      return {
        test: "参数验证",
        success: true,
        message: "参数验证正常工作",
      };
    } else {
      console.log(`❌ 参数验证失败：应该返回错误但返回了成功`);
      return {
        test: "参数验证",
        success: false,
        message: "参数验证未正常工作",
      };
    }
  } catch (error: any) {
    console.log(`❌ 错误：${error.message}`);
    return {
      test: "参数验证",
      success: false,
      message: error.message,
    };
  }
}

// 主测试函数
async function runTests() {
  console.log("=".repeat(60));
  console.log("🚀 开始测试图片相似搜索接口（通过ID或URL）");
  console.log("=".repeat(60));

  const results: TestResult[] = [];

  // 1. 参数验证测试
  results.push(await testParameterValidation());

  // 2. 通过图片ID搜索
  const imageId = await getImageIdFromDatabase();
  if (imageId) {
    results.push(await testSearchByImageId(imageId));
  } else {
    console.log("\n⚠️  警告：数据库中没有图片特征向量，跳过图片ID搜索测试");
    console.log("   提示：请先运行 npm run batch-process 处理图片");
  }

  // 3. 通过图片URL搜索
  const imageUrl = await getImageUrlFromDatabase();
  if (imageUrl) {
    results.push(await testSearchByImageUrl(imageUrl));
  } else {
    console.log("\n⚠️  警告：数据库中没有图片，跳过图片URL搜索测试");
  }

  // 输出测试结果摘要
  console.log("\n" + "=".repeat(60));
  console.log("📊 测试结果摘要");
  console.log("=".repeat(60));

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  results.forEach((result, index) => {
    const icon = result.success ? "✅" : "❌";
    console.log(`${index + 1}. ${icon} ${result.test}: ${result.message}`);
  });

  console.log("\n" + "-".repeat(60));
  console.log(
    `总计: ${successCount}/${totalCount} 个测试通过 (${
      totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(0) : 0
    }%)`
  );
  console.log("=".repeat(60));

  if (successCount === totalCount) {
    console.log("\n🎉 所有测试通过！");
  } else {
    console.log(`\n⚠️  有 ${totalCount - successCount} 个测试失败，请检查`);
  }
}

// 运行测试
runTests().catch((error) => {
  console.error("\n💥 测试执行失败:", error);
  process.exit(1);
});
