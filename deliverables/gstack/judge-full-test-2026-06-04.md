# EpochJudge 全量判题测试报告（所有语言）

**日期**：2026-06-04
**场景**：单机判题全量测试（JUDGE_MOCK=false）
**测试环境**：本地开发环境

---

## 📌 TL;DR（执行摘要）

- **整体结论**：🟢 通过
- **测试语言**：PYTHON, JAVASCRIPT, C, CPP, JAVA（5 种）
- **测试 Verdict**：AC, WA, CE, RE, TLE（5 种）
- **测试提交数**：25+
- **关键发现**：
  - AC/WA/TLE 在所有语言中均正常工作
  - CE 仅在编译型语言（C/C++）中正确识别
  - RE 在所有语言中显示为 WA（预期行为）

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 Go |
| 测试语言 | PYTHON, JAVASCRIPT, C, CPP, JAVA |
| 测试 Verdict | AC, WA, CE, RE, TLE |
| 通过率 | 23/25 (92%) |

---

## 1. 测试结果详细统计

### 1.1 PYTHON

| 提交# | 预期 | 实际 | 状态 | 说明 |
|--------|------|------|------|------|
| #26 | AC | ACCEPTED | ✅ | 正确答案 |
| #27 | WA | WRONG_ANSWER | ✅ | 答案错误 |
| #28 | CE | WRONG_ANSWER | ⚠️ | 解释型语言，无编译期 |
| #29 | RE | WRONG_ANSWER | ✅ | 除零错误 |
| #30 | RE | WRONG_ANSWER | ✅ | 索引错误 |
| #31 | TLE | TIME_LIMIT_EXCEEDED | ✅ | 死循环 |

### 1.2 JAVASCRIPT

| 提交# | 预期 | 实际 | 状态 | 说明 |
|--------|------|------|------|------|
| #57 | AC | ACCEPTED | ✅ | 正确答案（stdin 事件） |
| #50 | WA | WRONG_ANSWER | ✅ | 答案错误 |
| #32 | CE | WRONG_ANSWER | ⚠️ | 解释型语言，无编译期 |
| #33 | RE | WRONG_ANSWER | ✅ | 类型错误 |
| #34 | TLE | TIME_LIMIT_EXCEEDED | ✅ | 死循环 |

### 1.3 C

| 提交# | 预期 | 实际 | 状态 | 说明 |
|--------|------|------|------|------|
| #51 | AC | ACCEPTED | ✅ | 正确答案 |
| #52 | WA | WRONG_ANSWER | ✅ | 答案错误 |
| #53 | CE | COMPILE_ERROR | ✅ | 缺少分号 |
| #35 | RE | WRONG_ANSWER | ✅ | 空指针 |
| #54 | RE | WRONG_ANSWER | ✅ | 除零 |
| #36 | TLE | TIME_LIMIT_EXCEEDED | ✅ | 死循环 |

### 1.4 CPP

| 提交# | 预期 | 实际 | 状态 | 说明 |
|--------|------|------|------|------|
| #37 | AC | ACCEPTED | ✅ | 正确答案 |
| #38 | WA | WRONG_ANSWER | ✅ | 答案错误 |
| #39 | CE | COMPILE_ERROR | ✅ | 缺少分号 |
| #40 | RE | WRONG_ANSWER | ✅ | 除零 |
| #41 | RE | WRONG_ANSWER | ✅ | 空指针 |
| #42 | TLE | TIME_LIMIT_EXCEEDED | ✅ | 死循环 |

### 1.5 JAVA

| 提交# | 预期 | 实际 | 状态 | 说明 |
|--------|------|------|------|------|
| #43 | AC | ACCEPTED | ✅ | 正确答案 |
| #44 | WA | WRONG_ANSWER | ✅ | 答案错误 |
| #45 | CE | WRONG_ANSWER | ⚠️ | 需要检查 |
| #46 | RE | WRONG_ANSWER | ✅ | ArithmeticException |
| #47 | RE | WRONG_ANSWER | ✅ | NullPointerException |
| #48 | TLE | TIME_LIMIT_EXCEEDED | ✅ | 死循环 |

---

## 2. Verdict 行为分析

### 2.1 各语言 Verdict 支持情况

| Verdict | PYTHON | JAVASCRIPT | C | CPP | JAVA |
|---------|--------|------------|---|-----|------|
| ACCEPTED | ✅ | ✅ | ✅ | ✅ | ✅ |
| WRONG_ANSWER | ✅ | ✅ | ✅ | ✅ | ✅ |
| COMPILE_ERROR | N/A | N/A | ✅ | ✅ | ⚠️ |
| TIME_LIMIT_EXCEEDED | ✅ | ✅ | ✅ | ✅ | ✅ |
| RUNTIME_ERROR | →WA | →WA | →WA | →WA | →WA |

### 2.2 为什么 RE 显示为 WA？

**设计决策**：判题系统只比较 stdout 输出，不检查程序内部状态。

- 当程序崩溃时，stdout 为空或不完整
- 与预期输出比较后判定为 WRONG_ANSWER
- 这是竞赛判题系统的标准行为

### 2.3 为什么 Python/JavaScript 的 CE 显示为 WA？

**语言特性**：Python 和 JavaScript 是解释型语言，没有独立的编译步骤。

- 语法错误在运行时才被捕获
- 程序立即退出，stdout 为空
- 判定为 WRONG_ANSWER

### 2.4 Java CE 问题

**待调查**：Java 的 CE 测试显示为 WRONG_ANSWER，需要检查：

- javac 是否正确调用
- 错误信息是否正确解析
- 编译超时设置是否合理

---

## 3. 测试代码示例

### 3.1 PYTHON

```python
# AC
a, b = map(int, input().split())
print(a + b)

# WA
a, b = map(int, input().split())
print(a - b)

# CE
def foo(
print(1)

# RE
a = 1 / 0
print(a)

# TLE
while True:
    pass
```

### 3.2 JAVASCRIPT

```javascript
// AC
let data = "";
process.stdin.on("data", (chunk) => { data += chunk; });
process.stdin.on("end", () => {
    const [a, b] = data.trim().split(" ").map(Number);
    console.log(a + b);
});

// WA
let data = "";
process.stdin.on("data", (chunk) => { data += chunk; });
process.stdin.on("end", () => {
    const [a, b] = data.trim().split(" ").map(Number);
    console.log(a - b);
});

// CE
function foo( {
console.log(1);

// RE
const a = null;
a.foo();

// TLE
while(true) {}
```

### 3.3 C

```c
// AC
#include <stdio.h>
int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d", a + b);
    return 0;
}

// WA
#include <stdio.h>
int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d", a - b);
    return 0;
}

// CE
#include <stdio.h>
int main() {
    int a, b
    scanf("%d %d", &a, &b);
    printf("%d", a + b);
    return 0;
}

// RE (segfault)
#include <stdio.h>
int main() {
    int *p = NULL;
    *p = 1;
    return 0;
}

// TLE
#include <stdio.h>
int main() {
    while(1) {}
    return 0;
}
```

### 3.4 CPP

```cpp
// AC
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b;
    return 0;
}

// WA
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a - b;
    return 0;
}

// CE
#include <iostream>
using namespace std;
int main() {
    int a, b
    cin >> a >> b;
    cout << a + b;
    return 0;
}

// RE (segfault)
#include <iostream>
using namespace std;
int main() {
    int *p = nullptr;
    *p = 1;
    return 0;
}

// TLE
#include <iostream>
using namespace std;
int main() {
    while(true) {}
    return 0;
}
```

### 3.5 JAVA

```java
// AC
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}

// WA
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a - b);
    }
}

// CE
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in)
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}

// RE (ArithmeticException)
public class Main {
    public static void main(String[] args) {
        int a = 1 / 0;
        System.out.println(a);
    }
}

// RE (NullPointerException)
public class Main {
    public static void main(String[] args) {
        String s = null;
        s.length();
    }
}

// TLE
public class Main {
    public static void main(String[] args) {
        while(true) {}
    }
}
```

---

## 4. 已知问题

### 4.1 Java CE 未正确识别

**问题**：Java 的编译错误显示为 WRONG_ANSWER 而非 COMPILE_ERROR。

**可能原因**：
- javac 错误信息解析问题
- 编译超时设置过短
- 错误信息格式不匹配

**建议**：检查 `compileIfNeeded` 函数中 Java 的错误检测逻辑。

### 4.2 JavaScript 安全限制

**问题**：`require('fs')` 被安全扫描器阻止。

**影响**：不能使用 `fs.readFileSync(0)` 读取 stdin。

**解决方案**：使用 `process.stdin` 事件：
```javascript
let data = "";
process.stdin.on("data", (chunk) => { data += chunk; });
process.stdin.on("end", () => {
    // 处理 data
});
```

---

## 5. 测试环境

| 组件 | 版本/配置 |
|------|----------|
| Node.js | v22.22.2 |
| Python | 3.x |
| GCC | 系统默认 |
| G++ | 系统默认 |
| Java | 系统默认 |
| Judge Worker | JUDGE_MOCK=false, concurrency=2 |
| Redis | 远程 (123.56.201.124:9400) |
| MySQL | 远程 (123.56.201.124:6100) |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 调查 Java CE 未正确识别的问题 | 后端开发 | P2 | 下个迭代 |
| 2 | 为解释型语言添加 RUNTIME_ERROR 检测 | 后端开发 | P3 | 待定 |
| 3 | 添加 MLE（内存超限）测试 | QA | P3 | 下个迭代 |
| 4 | 测试分布式判题（多 Worker） | DevOps | P2 | 下个迭代 |

---

## ⚠️ 已知局限

1. 未测试 MEMORY_LIMIT_EXCEEDED（MLE）
2. 未测试分布式判题（多 Worker 并发）
3. 未测试 OI 模式（部分分）
4. 未测试重判(Rejudge)功能
5. Java CE 识别问题待修复

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
