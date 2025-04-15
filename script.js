const STORAGE_KEY = 'myCodeSpaceFileData';
let fileData = {};

function loadFileData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      fileData = JSON.parse(saved);
    } catch (e) {
      fileData = {};
    }
  } else {
    fileData = {
      "main.js": `console.log("Hello from main.js");`,
      "folder/helper.js": `export function help() { console.log("Help!"); }`
    };
  }
}

function saveFileData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fileData));
}

function generateTree(data) {
  const tree = [];
  Object.keys(data).forEach(path => {
    const parts = path.split('/');
    let current = tree;
    parts.forEach((part, i) => {
      let node = current.find(n => n.text === part);
      if (!node) {
        node = {
          id: parts.slice(0, i + 1).join('/'),
          text: part,
          children: [],
          icon: (i === parts.length - 1 && !path.endsWith('/')) ? "jstree-file" : undefined
        };
        current.push(node);
      }
      current = node.children;
    });
  });
  return tree;
}

function refreshTree() {
  $('#tree').jstree(true).settings.core.data = generateTree(fileData);
  $('#tree').jstree(true).refresh();
}

function createNewFolder() {
  const folderName = prompt("フォルダ名を入力してください:");
  if (!folderName) return;
  const folderPath = folderName.endsWith('/') ? folderName : folderName + '/';

  if (!fileData[folderPath]) {
    fileData[folderPath] = null;
    saveFileData();
    refreshTree();
  } else {
    alert("すでに存在します。");
  }
}

function createNewFile() {
  const fileName = prompt("新しいファイル名を入力してください（例: test.js）:");
  if (!fileName || fileName.endsWith('/')) {
    alert("正しいファイル名を入力してください");
    return;
  }
  if (fileData[fileName] !== undefined) {
    alert("すでにそのファイルは存在します！");
    return;
  }
  fileData[fileName] = '';
  saveFileData();
  refreshTree();
}

function deleteSelectedFile() {
  const selected = $('#tree').jstree(true).get_selected()[0];
  if (!selected) return;
  if (fileData[selected] === null) {
    alert("これはフォルダです！");
    return;
  }
  if (confirm(`${selected} を削除しますか？`)) {
    delete fileData[selected];
    saveFileData();
    refreshTree();
    editor.setValue('');
  }
}

function deleteSelectedFolder() {
  const selected = $('#tree').jstree(true).get_selected()[0];
  if (!selected) return;
  if (fileData[selected] !== null) {
    alert("これはフォルダではありません！");
    return;
  }
  if (!confirm(`${selected} を中のファイルごと削除しますか？`)) return;
  Object.keys(fileData).forEach(key => {
    if (key === selected || key.startsWith(selected)) {
      delete fileData[key];
    }
  });
  saveFileData();
  refreshTree();
  editor.setValue('');
}

function saveCurrentFile() {
  const selected = $('#tree').jstree(true).get_selected()[0];
  if (selected && fileData[selected] !== null) {
    fileData[selected] = editor.getValue();
    saveFileData();
    alert("保存しました！");
  }
}

let editor;

$(function () {
  loadFileData();
  $('#tree').jstree({ core: { data: generateTree(fileData) } });

  require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs' }});
  require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('container'), {
      value: '',
      language: 'javascript',
      theme: 'vs-dark'
    });

    editor.layout();

    $('#tree').on("select_node.jstree", function (e, data) {
      const path = data.node.id;
      if (fileData[path] !== null) {
        editor.setValue(fileData[path]);
        editor.updateOptions({ readOnly: false });
        editor.focus();
      } else {
        editor.setValue('// フォルダが選ばれました');
        editor.updateOptions({ readOnly: true });
      }
    });

    window.addEventListener('resize', () => editor.layout());
  });
});

const cmdInput = document.getElementById("cmdInput");
const cmdOutput = document.getElementById("cmdOutput");
const currentDir = document.getElementById("currentDir");

cmdInput.addEventListener("keydown", async function (e) {
  if (e.key === "Enter") {
    const command = cmdInput.value.trim();
    cmdOutput.textContent += "> " + command + "\n";
    cmdInput.value = "";

    const res = await fetch("https://python-text.onrender.com/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    });

    const data = await res.json();
    if (data.error) {
      cmdOutput.textContent += `エラー: ${data.error}\n`;
    } else {
      if (command.startsWith("cd ") && data.stdout) {
        currentDir.textContent = data.stdout.replace("現在のディレクトリ: ", "").trim();
      }
      cmdOutput.textContent += data.stdout || "";
      cmdOutput.textContent += data.stderr || "";
    }

    cmdOutput.scrollTop = cmdOutput.scrollHeight;
  }
});

async function loadFileList() {
  const res = await fetch("https://python-text.onrender.com/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  const data = await res.json();
  const fileList = document.getElementById("fileList");
  const currentDir = document.getElementById("currentDir");

  fileList.innerHTML = "";
  currentDir.textContent = data.path;

  for (const entry of data.entries) {
    const li = document.createElement("li");
    li.textContent = entry.name;
    li.style.cursor = "pointer";
    if (entry.type === "folder") {
      li.style.fontWeight = "bold";
    }

    li.addEventListener("click", () => {
      if (entry.type === "folder") {
        document.getElementById("cmdInput").value = `cd "${entry.name}"`;
        document.getElementById("cmdInput").dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
        setTimeout(loadFileList, 300);
      }
    });

    fileList.appendChild(li);
  }
}

loadFileList();
