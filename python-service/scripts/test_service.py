"""测试服务是否运行"""
import time
import requests
import sys

print("等待服务启动...")
time.sleep(8)

try:
    print("测试服务健康检查端点...")
    r = requests.get('http://localhost:8000/health', timeout=5)
    print(f"状态码: {r.status_code}")
    print(f"响应: {r.json()}")
    print("\n✅ 服务运行正常！")
    sys.exit(0)
except requests.exceptions.ConnectionError:
    print("❌ 无法连接到服务，服务可能未启动")
    sys.exit(1)
except Exception as e:
    print(f"❌ 测试失败: {e}")
    sys.exit(1)
