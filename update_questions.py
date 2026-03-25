import requests
import json

BASE_URL = "https://quiz-backend-qfaw.onrender.com"
TOKEN = "ebdc7a9ed2c2c7d6948774f36af6533762296158"

HEADERS = {
    "Authorization": f"Token {TOKEN}",
    "Content-Type": "application/json"
}

UPDATES = [
    # Q33: Missing Number
    {
        "id": 33,
        "code_python": "def find_missing(arr):\n    n = len(arr)\n    expected_sum = n * (n + 1) // 2\n    actual_sum = sum(arr)\n    return expected_sum - actual_sum\n\nif __name__ == '__main__':\n    import sys\n    data = sys.stdin.read().split()\n    if data:\n        n = int(data[0])\n        arr = [int(x) for x in data[1:]]\n        print(find_missing(arr))",
        "code_java": "import java.util.*;\n\npublic class Main {\n    public static int findMissing(int[] arr) {\n        int n = arr.length;\n        int expectedSum = n * (n + 1) / 2;\n        int actualSum = 0;\n        for (int x : arr) actualSum += x;\n        return expectedSum - actualSum;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int[] arr = new int[n];\n            for (int i = 0; i < n; i++) arr[i] = sc.nextInt();\n            System.out.println(findMissing(arr));\n        }\n    }\n}",
        "code_c": "#include <stdio.h>\n\nint find_missing(int* arr, int n) {\n    int expected_sum = n * (n + 1) / 2;\n    int actual_sum = 0;\n    for (int i = 0; i < n; i++) actual_sum += arr[i];\n    return expected_sum - actual_sum;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) == 1) {\n        int arr[n];\n        for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n        printf(\"%d\\n\", find_missing(arr, n));\n    }\n    return 0;\n}"
    },
    # Q34: Longest Substring
    {
        "id": 34,
        "code_python": "def longest_substring(s):\n    seen = {}\n    max_len = 0\n    start = 0\n    for i, char in enumerate(s):\n        if char in seen and seen[char] >= start:\n            start = seen[char] + 1\n        seen[char] = i\n        max_len = max(max_len, i - start + 1)\n    return max_len\n\nif __name__ == '__main__':\n    import sys\n    s = sys.stdin.read().strip()\n    print(longest_substring(s))",
        "code_java": "import java.util.*;\n\npublic class Main {\n    public static int longestSubstring(String s) {\n        Map<Character, Integer> seen = new HashMap<>();\n        int maxLen = 0, start = 0;\n        for (int i = 0; i < s.length(); i++) {\n            char c = s.charAt(i);\n            if (seen.containsKey(c) && seen.get(c) >= start) {\n                start = seen.get(c) + 1;\n            }\n            seen.put(c, i);\n            maxLen = Math.max(maxLen, i - start + 1);\n        }\n        return maxLen;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            System.out.println(longestSubstring(sc.nextLine()));\n        }\n    }\n}",
        "code_c": "#include <stdio.h>\n#include <string.h>\n\nint longest_substring(char * s) {\n    int seen[256];\n    for(int i=0; i<256; i++) seen[i] = -1;\n    int max_len = 0, start = 0;\n    int n = strlen(s);\n    for (int i = 0; i < n; i++) {\n        unsigned char c = s[i];\n        if (seen[c] >= start) {\n            start = seen[c] + 1;\n        }\n        seen[c] = i;\n        int cur = i - start + 1;\n        if (cur > max_len) max_len = cur;\n    }\n    return max_len;\n}\n\nint main() {\n    char s[10000];\n    if (scanf(\"%s\", s) == 1) {\n        printf(\"%d\\n\", longest_substring(s));\n    }\n    return 0;\n}"
    },
    # Q35: Rotated Search
    {
        "id": 35,
        "code_python": "def search_rotated(nums, target):\n    l, r = 0, len(nums) - 1\n    while l <= r:\n        mid = (l + r) // 2\n        if nums[mid] == target: return mid\n        if nums[l] <= nums[mid]:\n            if nums[l] <= target < nums[mid]: r = mid - 1\n            else: l = mid + 1\n        else:\n            if nums[mid] < target <= nums[r]: l = mid + 1\n            else: r = mid - 1\n    return -1\n\nif __name__ == '__main__':\n    import sys\n    data = sys.stdin.read().split()\n    if data:\n        n = int(data[0])\n        nums = [int(x) for x in data[1:n+1]]\n        target = int(data[n+1])\n        print(search_rotated(nums, target))",
        "code_java": "import java.util.Scanner;\n\npublic class Main {\n    public static int searchRotated(int[] nums, int target) {\n        int l = 0, r = nums.length - 1;\n        while (l <= r) {\n            int mid = l + (r - l) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[l] <= nums[mid]) {\n                if (nums[l] <= target && target < nums[mid]) r = mid - 1;\n                else l = mid + 1;\n            } else {\n                if (nums[mid] < target && target <= nums[r]) l = mid + 1;\n                else r = mid - 1;\n            }\n        }\n        return -1;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int[] nums = new int[n];\n            for (int i = 0; i < n; i++) nums[i] = sc.nextInt();\n            int target = sc.nextInt();\n            System.out.println(searchRotated(nums, target));\n        }\n    }\n}",
        "code_c": "#include <stdio.h>\n\nint search_rotated(int* nums, int n, int target) {\n    int l = 0, r = n - 1;\n    while (l <= r) {\n        int mid = l + (r - l) / 2;\n        if (nums[mid] == target) return mid;\n        if (nums[l] <= nums[mid]) {\n            if (nums[l] <= target && target < nums[mid]) r = mid - 1;\n            else l = mid + 1;\n        } else {\n            if (nums[mid] < target && target <= nums[r]) l = mid + 1;\n            else r = mid - 1;\n        }\n    }\n    return -1;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) == 1) {\n        int nums[n];\n        for (int i = 0; i < n; i++) scanf(\"%d\", &nums[i]);\n        int target;\n        scanf(\"%d\", &target);\n        printf(\"%d\\n\", search_rotated(nums, n, target));\n    }\n    return 0;\n}"
    },
    # Q36: Generate Parentheses
    {
        "id": 36,
        "code_python": "def generate_parenthesis(n):\n    res = []\n    def backtrack(s, left, right):\n        if len(s) == 2 * n:\n            res.append(s)\n            return\n        if left < n: backtrack(s + '(', left + 1, right)\n        if right < left: backtrack(s + ')', left, right + 1)\n    backtrack('', 0, 0)\n    return res\n\nif __name__ == '__main__':\n    import sys\n    line = sys.stdin.read().strip()\n    if line:\n        n = int(line)\n        for p in generate_parenthesis(n):\n            print(p)",
        "code_java": "import java.util.*;\n\npublic class Main {\n    public static void backtrack(List<String> res, String s, int left, int right, int n) {\n        if (s.length() == 2 * n) {\n            res.add(s);\n            return;\n        }\n        if (left < n) backtrack(res, s + \"(\", left + 1, right, n);\n        if (right < left) backtrack(res, s + \")\", left, right + 1, n);\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            List<String> res = new ArrayList<>();\n            backtrack(res, \"\", 0, 0, n);\n            for (String ps : res) System.out.println(ps);\n        }\n    }\n}",
        "code_c": "#include <stdio.h>\n#include <string.h>\n\nvoid backtrack(int n, int left, int right, char* s, int pos) {\n    if (pos == 2 * n) {\n        s[pos] = '\\0';\n        printf(\"%s\\n\", s);\n        return;\n    }\n    if (left < n) {\n        s[pos] = '(';\n        backtrack(n, left + 1, right, s, pos + 1);\n    }\n    if (right < left) {\n        s[pos] = ')';\n        backtrack(n, left, right + 1, s, pos + 1);\n    }\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) == 1) {\n        char s[2 * n + 1];\n        backtrack(n, 0, 0, s, 0);\n    }\n    return 0;\n}"
    },
    # Q37: Max Subarray
    {
        "id": 37,
        "code_python": "def max_sub_array(nums):\n    cur_sum = max_sum = nums[0]\n    for x in nums[1:]:\n        cur_sum = max(x, cur_sum + x)\n        max_sum = max(max_sum, cur_sum)\n    return max_sum\n\nif __name__ == '__main__':\n    import sys\n    data = sys.stdin.read().split()\n    if data:\n        n = int(data[0])\n        nums = [int(x) for x in data[1:]]\n        print(max_sub_array(nums))",
        "code_java": "import java.util.Scanner;\n\npublic class Main {\n    public static int maxSubArray(int[] nums) {\n        int curSum = nums[0], maxSum = nums[0];\n        for (int i = 1; i < nums.length; i++) {\n            curSum = Math.max(nums[i], curSum + nums[i]);\n            maxSum = Math.max(maxSum, curSum);\n        }\n        return maxSum;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int[] nums = new int[n];\n            for (int i = 0; i < n; i++) nums[i] = sc.nextInt();\n            System.out.println(maxSubArray(nums));\n        }\n    }\n}",
        "code_c": "#include <stdio.h>\n\nint max_sub_array(int* nums, int n) {\n    int cur_sum = nums[0], max_sum = nums[0];\n    for (int i = 1; i < n; i++) {\n        if (nums[i] > cur_sum + nums[i]) cur_sum = nums[i];\n        else cur_sum += nums[i];\n        if (cur_sum > max_sum) max_sum = cur_sum;\n    }\n    return max_sum;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) == 1) {\n        int nums[n];\n        for (int i = 0; i < n; i++) scanf(\"%d\", &nums[i]);\n        printf(\"%d\\n\", max_sub_array(nums, n));\n    }\n    return 0;\n}"
    }
]

print(f"Updating {len(UPDATES)} questions...")
resp = requests.post(f"{BASE_URL}/api/admin/questions/bulk-update/", json=UPDATES, headers=HEADERS)
print(f"Status: {resp.status_code}")
try:
    print(json.dumps(resp.json(), indent=2))
except:
    print(resp.text)
