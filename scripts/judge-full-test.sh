#!/bin/bash
# EpochJudge 全量判题测试脚本
# 测试所有语言的所有判题状态

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXB5MDgyODAwMDBldWU4OTJoZHl0ZDJ3IiwidXNlcm5hbWUiOiJzbW9rZV91c2VyIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3ODA1NDA5NTksImV4cCI6MTc4MTE0NTc1OX0.5mQH1jMsOZE-JJwRtQjBXkN1pjS3Xgxt8s7oBe_mAB4"
PROBLEM_ID="cmpyv455n001iue89a2cgo7dp"
API="http://localhost:3000/api/v1"

submit() {
    local lang=$1
    local code=$2
    local desc=$3
    echo "Submitting: $desc ($lang)"
    curl -s -X POST "$API/submissions" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"problemId\":\"$PROBLEM_ID\",\"language\":\"$lang\",\"sourceCode\":\"$code\"}"
    echo ""
}

echo "===== PYTHON TESTS ====="

# AC
submit "PYTHON" "a, b = map(int, input().split())\nprint(a + b)" "AC"

# WA
submit "PYTHON" "a, b = map(int, input().split())\nprint(a - b)" "WA"

# CE (syntax error)
submit "PYTHON" "def foo(\nprint(1)" "CE-SyntaxError"

# RE (division by zero)
submit "PYTHON" "a = 1 / 0\nprint(a)" "RE-DivZero"

# RE (index error)
submit "PYTHON" "a = [][1]\nprint(a)" "RE-IndexError"

# TLE (infinite loop)
submit "PYTHON" "while True:\n    pass" "TLE"

echo ""
echo "===== JAVASCRIPT TESTS ====="

# AC
submit "JAVASCRIPT" "const fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf-8').trim().split(' ').map(Number);\nconsole.log(a + b);" "AC"

# WA
submit "JAVASCRIPT" "const fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf-8').trim().split(' ').map(Number);\nconsole.log(a - b);" "WA"

# CE (syntax error)
submit "JAVASCRIPT" "function foo( {\nconsole.log(1);" "CE-SyntaxError"

# RE (type error)
submit "JAVASCRIPT" "const a = null;\na.foo();" "RE-TypeError"

# TLE
submit "JAVASCRIPT" "while(true) {}" "TLE"

echo ""
echo "===== C TESTS ====="

# AC
submit "C" "#include <stdio.h>\nint main() {\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    printf(\"%d\", a + b);\n    return 0;\n}" "AC"

# WA
submit "C" "#include <stdio.h>\nint main() {\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    printf(\"%d\", a - b);\n    return 0;\n}" "WA"

# CE (missing semicolon)
submit "C" "#include <stdio.h>\nint main() {\n    int a, b\n    scanf(\"%d %d\", &a, &b);\n    printf(\"%d\", a + b);\n    return 0;\n}" "CE-MissingSemicolon"

# RE (div by zero)
submit "C" "#include <stdio.h>\nint main() {\n    int a = 1 / 0;\n    printf(\"%d\", a);\n    return 0;\n}" "RE-DivZero"

# RE (segfault)
submit "C" "#include <stdio.h>\nint main() {\n    int *p = NULL;\n    *p = 1;\n    return 0;\n}" "RE-Segfault"

# TLE
submit "C" "#include <stdio.h>\nint main() {\n    while(1) {}\n    return 0;\n}" "TLE"

echo ""
echo "===== CPP TESTS ====="

# AC
submit "CPP" "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b;\n    return 0;\n}" "AC"

# WA
submit "CPP" "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a - b;\n    return 0;\n}" "WA"

# CE (missing semicolon)
submit "CPP" "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b\n    cin >> a >> b;\n    cout << a + b;\n    return 0;\n}" "CE-MissingSemicolon"

# RE (div by zero)
submit "CPP" "#include <iostream>\nusing namespace std;\nint main() {\n    int a = 1 / 0;\n    cout << a;\n    return 0;\n}" "RE-DivZero"

# RE (segfault)
submit "CPP" "#include <iostream>\nusing namespace std;\nint main() {\n    int *p = nullptr;\n    *p = 1;\n    return 0;\n}" "RE-Segfault"

# TLE
submit "CPP" "#include <iostream>\nusing namespace std;\nint main() {\n    while(true) {}\n    return 0;\n}" "TLE"

echo ""
echo "===== JAVA TESTS ====="

# AC
submit "JAVA" "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}" "AC"

# WA
submit "JAVA" "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a - b);\n    }\n}" "WA"

# CE (missing semicolon)
submit "JAVA" "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in)\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}" "CE-MissingSemicolon"

# RE (div by zero)
submit "JAVA" "public class Main {\n    public static void main(String[] args) {\n        int a = 1 / 0;\n        System.out.println(a);\n    }\n}" "RE-ArithmeticException"

# RE (null pointer)
submit "JAVA" "public class Main {\n    public static void main(String[] args) {\n        String s = null;\n        s.length();\n    }\n}" "RE-NullPointerException"

# TLE
submit "JAVA" "public class Main {\n    public static void main(String[] args) {\n        while(true) {}\n    }\n}" "TLE"

echo ""
echo "===== All submissions done. Waiting 30s for judging... ====="
sleep 30

echo ""
echo "===== RESULTS ====="
curl -s "$API/submissions" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for d in data[:50]:
    print(f'#{d[\"number\"]}: {d[\"status\"]:25} ({d[\"language\"]})')
"
