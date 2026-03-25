import requests
resp = requests.post("https://quiz-backend-qfaw.onrender.com/api/compile/", json={"language": "c", "code": "#include <stdio.h>\nint main() { printf(\"123\\n\"); return 0; }", "input": ""})
print(resp.json())
