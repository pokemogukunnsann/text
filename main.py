from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import subprocess
import os

app = Flask(__name__)
CORS(app, origins='*', methods=['GET', 'POST'])

# 仮想のカレントディレクトリ（グローバル）
current_path = os.getcwd()

@app.route("/run", methods=["POST"])
def run_command():
    global current_path
    data = request.json
    cmd = data.get("command")

    try:
        if cmd.startswith("cd "):
            # パスを抽出して現在のパスを更新
            new_path = os.path.abspath(os.path.join(current_path, cmd[3:].strip()))
            if os.path.isdir(new_path):
                current_path = new_path
                return jsonify({
                    "stdout": f"現在のディレクトリ: {current_path}\n",
                    "stderr": "",
                    "code": 0
                })
            else:
                return jsonify({
                    "stdout": "",
                    "stderr": "指定されたディレクトリが存在しません。",
                    "code": 1
                })

        # 通常のコマンドは current_path 上で実行
        result = subprocess.run(cmd, shell=True, cwd=current_path, capture_output=True, text=True)
        return jsonify({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "code": result.returncode
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/list", methods=["POST"])
def list_directory():
    global current_path
    try:
        files = os.listdir(current_path)
        entries = []
        for name in files:
            full_path = os.path.join(current_path, name)
            entries.append({
                "name": name,
                "type": "folder" if os.path.isdir(full_path) else "file"
            })
        return jsonify({
            "path": current_path,
            "entries": entries
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

