import axios from "axios";
import { createDbConnection } from "../app/utils/db.js";
import { Client } from "pg";

const API_BASE_URL = "http://127.0.0.1:7001/api";

// 测试结果接口
interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

// 从数据库获取多个图片ID
async function getImageIdsFromDatabase(count: number = 100): Promise<string[]> {
  let client: Client | undefined;
  try {
    client = await createDbConnection();
    const result = await client.query(
      `SELECT image_id::text as image_id 
       FROM tb_hsx_img_value 
       LIMIT $1`,
      [count]
    );

    return result.rows.map((row) => row.image_id);
  } catch (error) {
    console.error("从数据库获取图片ID失败:", error);
    return [];
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// 测试：批量查询相似图片（空数组）
async function testEmptyImageIds(): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试：空图片ID数组`);
    const response = await axios.post(`${API_BASE_URL}/test`, {
      imageIds: [],
    });

    const result = response.data;

    if (Array.isArray(result) && result.length === 0) {
      console.log(`✅ 成功！返回空数组`);
      return {
        test: "空图片ID数组",
        success: true,
        message: "正确处理空数组",
        data: result,
      };
    } else {
      console.log(`❌ 失败：应该返回空数组，但返回了其他格式`);
      return {
        test: "空图片ID数组",
        success: false,
        message: "返回格式不正确",
      };
    }
  } catch (error: any) {
    console.log(`❌ 错误：${error.message}`);
    return {
      test: "空图片ID数组",
      success: false,
      message: error.message,
    };
  }
}

// 测试：批量查询相似图片（单个图片ID）
async function testSingleImageId(imageId: string): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试：单个图片ID查询 (ID: ${imageId})`);
    const response = await axios.post(`${API_BASE_URL}/test`, {
      imageIds: [imageId],
    });

    const result = response.data;

    console.log(result, "+++++++++++++++++");

    if (Array.isArray(result) && result.length === 1) {
      const item = result[0];
      if (
        item.url !== undefined &&
        item.imageId !== undefined &&
        Array.isArray(item.similarities)
      ) {
        console.log(`✅ 成功！返回格式正确`);
        console.log(`   图片ID: ${item.imageId}`);
        console.log(`   图片URL: ${item.url}`);
        console.log(`   相似图片数量: ${item.similarities.length}`);
        if (item.similarities.length > 0) {
          console.log(`   前3个相似图片URL:`);
          item.similarities
            .slice(0, 3)
            .forEach((url: string, index: number) => {
              console.log(`     ${index + 1}. ${url}`);
            });
        }
        return {
          test: "单个图片ID查询",
          success: true,
          message: `找到 ${item.similarities.length} 个相似图片`,
          data: item,
        };
      } else {
        console.log(`❌ 失败：返回格式不正确`);
        return {
          test: "单个图片ID查询",
          success: false,
          message: "返回格式不正确",
        };
      }
    } else {
      console.log(`❌ 失败：应该返回包含1个元素的数组`);
      return {
        test: "单个图片ID查询",
        success: false,
        message: "返回数组长度不正确",
      };
    }
  } catch (error: any) {
    console.log(`❌ 错误：${error.message}`);
    if (error.response) {
      console.log(`   响应状态: ${error.response.status}`);
      console.log(`   响应数据:`, JSON.stringify(error.response.data, null, 2));
    }
    return {
      test: "单个图片ID查询",
      success: false,
      message: error.message,
    };
  }
}

// 测试：批量查询相似图片（多个图片ID）
async function testMultipleImageIds(imageIds: string[]): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试：多个图片ID批量查询 (${imageIds.length} 个)`);
    console.log(`   图片ID列表: ${imageIds.join(", ")}`);
    const response = await axios.post(`${API_BASE_URL}/test`, {
      imageIds: imageIds,
    });

    const result = response.data;

    console.log(result, "+++++++++++++++++");

    if (Array.isArray(result) && result.length === imageIds.length) {
      console.log(`✅ 成功！返回 ${result.length} 个结果`);
      result.forEach((item: any, index: number) => {
        console.log(`   ${index + 1}. 图片ID: ${item.imageId}`);
        console.log(`      相似图片数量: ${item.similarities.length}`);
        if (item.similarities.length > 0) {
          console.log(`      前2个相似图片URL:`);
          item.similarities.slice(0, 2).forEach((url: string, i: number) => {
            console.log(`        ${i + 1}. ${url.substring(0, 80)}...`);
          });
        }
      });

      // 验证每个结果都包含必要字段
      const allValid = result.every(
        (item: any) =>
          item.url !== undefined &&
          item.imageId !== undefined &&
          Array.isArray(item.similarities)
      );

      if (allValid) {
        return {
          test: "多个图片ID批量查询",
          success: true,
          message: `成功处理 ${result.length} 个图片`,
          data: result,
        };
      } else {
        return {
          test: "多个图片ID批量查询",
          success: false,
          message: "部分结果格式不正确",
        };
      }
    } else {
      console.log(
        `❌ 失败：应该返回 ${imageIds.length} 个结果，但返回了 ${result.length} 个`
      );
      return {
        test: "多个图片ID批量查询",
        success: false,
        message: "返回结果数量不正确",
      };
    }
  } catch (error: any) {
    console.log(`❌ 错误：${error.message}`);
    if (error.response) {
      console.log(`   响应状态: ${error.response.status}`);
      console.log(`   响应数据:`, JSON.stringify(error.response.data, null, 2));
    }
    return {
      test: "多个图片ID批量查询",
      success: false,
      message: error.message,
    };
  }
}

// 测试：参数验证（无效参数）
async function testInvalidParameters(): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试：参数验证（无效参数）`);
    const response = await axios.post(`${API_BASE_URL}/test`, {
      invalidField: "test",
    });

    const result = response.data;

    // 如果返回空数组，说明参数验证正常
    if (Array.isArray(result)) {
      console.log(`✅ 参数验证正常！返回空数组`);
      return {
        test: "参数验证",
        success: true,
        message: "参数验证正常工作",
      };
    } else {
      console.log(`❌ 参数验证失败：应该返回数组格式`);
      return {
        test: "参数验证",
        success: false,
        message: "参数验证未正常工作",
      };
    }
  } catch (error: any) {
    // 如果请求失败，也可能是正常的参数验证
    if (error.response && error.response.status >= 400) {
      console.log(`✅ 参数验证正常！服务器返回错误状态`);
      return {
        test: "参数验证",
        success: true,
        message: "参数验证正常工作",
      };
    }
    console.log(`❌ 错误：${error.message}`);
    return {
      test: "参数验证",
      success: false,
      message: error.message,
    };
  }
}

// 测试：不存在的图片ID
async function testNonExistentImageId(): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试：不存在的图片ID`);
    const fakeImageId = "9999999999999999999";
    const response = await axios.post(`${API_BASE_URL}/test`, {
      imageIds: [fakeImageId],
    });

    const result = response.data;

    if (Array.isArray(result) && result.length === 1) {
      const item = result[0];
      if (item.imageId === fakeImageId && item.similarities.length === 0) {
        console.log(`✅ 成功！正确处理不存在的图片ID`);
        console.log(`   返回的imageId: ${item.imageId}`);
        console.log(`   相似图片数量: ${item.similarities.length}`);
        return {
          test: "不存在的图片ID",
          success: true,
          message: "正确处理不存在的图片ID",
          data: item,
        };
      } else {
        console.log(`❌ 失败：返回格式不正确`);
        return {
          test: "不存在的图片ID",
          success: false,
          message: "返回格式不正确",
        };
      }
    } else {
      console.log(`❌ 失败：应该返回包含1个元素的数组`);
      return {
        test: "不存在的图片ID",
        success: false,
        message: "返回数组长度不正确",
      };
    }
  } catch (error: any) {
    console.log(`❌ 错误：${error.message}`);
    return {
      test: "不存在的图片ID",
      success: false,
      message: error.message,
    };
  }
}

// 主测试函数
async function runTests() {
  console.log("=".repeat(60));
  console.log("🚀 开始测试 /api/test 接口（批量查询相似图片）");
  console.log("=".repeat(60));

  const results: TestResult[] = [];

  // 1. 参数验证测试
  results.push(await testInvalidParameters());

  // 2. 空数组测试
  results.push(await testEmptyImageIds());

  // 3. 不存在的图片ID测试
  results.push(await testNonExistentImageId());

  // 4. 单个图片ID测试
  const imageIds = await getImageIdsFromDatabase(1);
  if (imageIds.length > 0) {
    results.push(await testSingleImageId(imageIds[0]));
  } else {
    console.log("\n⚠️  警告：数据库中没有图片特征向量，跳过单个图片ID测试");
    console.log("   提示：请先运行 npm run batch-process 处理图片");
  }

  // 5. 多个图片ID批量测试
  const multipleImageIds = await getImageIdsFromDatabase(100);
  if (multipleImageIds.length >= 2) {
    results.push(await testMultipleImageIds(multipleImageIds));
  } else if (multipleImageIds.length === 1) {
    console.log("\n⚠️  警告：数据库中只有1个图片特征向量，跳过批量测试");
  } else {
    console.log("\n⚠️  警告：数据库中没有图片特征向量，跳过批量测试");
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
