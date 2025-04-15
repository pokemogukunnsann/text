from flask import Flask, request
import datetime

app = Flask(__name__)

@app.route('/upload', methods=['POST'])
def upload():
    data = request.json
    with open(f"backup_{datetime.datetime.now().isoformat()}.txt", "w", encoding="utf-8") as f:
        f.write(data.get("content", ""))
    return {"status": "success"}
