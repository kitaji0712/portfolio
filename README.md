# Yuta Kitajima — Portfolio

北嶋優太のポートフォリオ。ビルド不要の静的サイト（HTML / CSS / JavaScript、three.js + cannon-es）。

## ローカルで見る

```bash
python3 -m http.server 4611
```

`http://localhost:4611/` を開く。

## 更新のしかた

- **文章（いちばん簡単）**：サイトを `?edit` 付きで開く（https://kitaji0712.github.io/portfolio/?edit）。文字をクリックして直し、Save。
  - 保存先は `content.json`。初回だけ GitHub の Fine-grained token が必要（portfolio だけ、Contents: Read and write）。
  - 鍵はそのブラウザにだけ残る。経歴の行は ↑ ↓ × と「+ 追加」で増減でき、ヒーローの項目とタグは空にすると消える。
- **作品・About の文章を直接**：`content.json`（作品の並び順もここ）。
- **3D モデル**：`js/models.js`。作品の `key` と同じ名前の関数を `builders` に登録する。
- **Blender のモデル**：`tools/*.py` で作って `models/*.glb` に書き出す（例：`/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/suyasuya.py -- models/suyasuya.glb`）。suyasuya は印刷パーツの寸法から作っている。
- **レイアウト・リンク先**：`index.html`。
- **見た目**：`styles.css` の `:root` に色と余白。

`main` に push すると GitHub Pages に反映される。
