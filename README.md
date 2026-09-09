# 居家點餐 App

單人使用的居家線上點餐 App。純前端網站，資料保存在使用者裝置瀏覽器的 IndexedDB 中，
不需要任何後端伺服器、不需要登入。

## 本機開發

```bash
npm install
npm run dev
```

瀏覽器開啟終端機顯示的網址（預設 http://localhost:5173）即可使用。

## 打包成 production build

```bash
npm run build
```

執行完成後，`dist/` 資料夾就是可以直接部署的靜態網站檔案。

可以先用以下指令在本機預覽 production build：

```bash
npm run preview
```

## 部署到 Netlify

1. 將整個專案上傳到 GitHub（或直接把 `dist` 資料夾拖曳到 Netlify 的部署頁面）。
2. 若用 Git 串接部署，Build command 設定為 `npm run build`，Publish directory 設定為 `dist`。

## 部署到 Vercel

1. 將專案匯入 Vercel（`vercel` CLI 或連結 GitHub repo 皆可）。
2. Framework Preset 選擇 Vite；Build Command 為 `npm run build`；Output Directory 為 `dist`。

## 資料儲存說明

* 所有餐點資料、餐點圖片、每日點餐紀錄，都儲存在瀏覽器原生的 **IndexedDB**（`src/db.js`）。
* 資料保存在「使用者當下這台裝置、這個瀏覽器」中：
  * 重新整理頁面 → 資料仍在。
  * 完全關閉瀏覽器再重新打開 → 資料仍在。
  * 換一台裝置或換一個瀏覽器 → 是全新、空白的資料（IndexedDB 本質上就是裝置本機儲存，
    不會透過網路同步）。
* 沒有使用任何只能在 Claude 預覽環境執行的 API（例如 `window.storage`），可以放心部署到
  一般靜態網站空間（Netlify、Vercel、GitHub Pages 等皆可）。
