# Yuta Kitajima — Portfolio

北嶋優太のポートフォリオ。ビルド不要の静的サイト（HTML / CSS / JavaScript、three.js + cannon-es）。

## ローカルで見る

```bash
python3 -m http.server 4611
```

`http://localhost:4611/` を開く。

## 更新のしかた

- **作品**：`js/main.js` 冒頭の `WORKS`（並び順もここ）。
- **3D モデル**：`js/models.js`。作品の `key` と同じ名前の関数を `builders` に登録する。
- **About・連絡先**：`index.html`。
- **見た目**：`styles.css` の `:root` に色と余白。

`main` に push すると GitHub Pages に反映される。
