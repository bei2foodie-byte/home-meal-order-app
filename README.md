# 居家點餐 App

給兩位固定使用者用的居家線上點餐 App。前端是 Vite + React 的靜態網站，資料存放在
**Supabase**（雲端 Postgres 資料庫 + Storage），所以手機、電腦、任何裝置打開都會看到同一份資料。

## 這個版本改了什麼

* 不再使用 IndexedDB 或 `window.storage`，資料來源改成 Supabase。
* 進入 App 先選「今天是誰點餐？」（使用者 A / 使用者 B），身份記在瀏覽器 `localStorage`，
  重新整理不用重選；每頁最上方都有「切換使用者」。
* 餐點（菜單）兩人共用；每日點餐紀錄依 `user_id + date` 各存一筆，兩人互不覆蓋。
* 餐點圖片上傳到 Supabase Storage 的 `meal-images` bucket，資料庫只存圖片網址。
* UI、五大分類、橫向滑動餐點卡、底部導覽列、配色等完全沒有重新設計。

## 一、建立 Supabase 專案

1. 到 [supabase.com](https://supabase.com) 建立一個新專案。
2. 進入該專案的 **SQL Editor**，貼上並執行本專案根目錄的 `supabase.sql`。
   這會建立 `users` / `meals` / `daily_orders` 三張表、對應的 index、RLS
   policy，以及 `meal-images` Storage bucket。
3. 到 **Project Settings -> API**，複製：
   * `Project URL`
   * `anon` / `public` key（**不是** `service_role` key）

## 二、設定環境變數

本機開發：

```bash
cp .env.example .env
```

打開 `.env`，填入剛剛複製的兩個值：

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
```

`.env` 已經在 `.gitignore` 中，不會被提交到 GitHub。

## 三、本機開發 / 打包

```bash
npm install
npm run dev      # 本機預覽，預設 http://localhost:5173
npm run build    # 產生可部署的 dist/ 資料夾
npm run preview  # 本機預覽 production build
```

## 四、部署到 Netlify

1. 把專案推到 GitHub，在 Netlify 建立新站台並連結這個 repo。
2. Build command：`npm run build`；Publish directory：`dist`。
3. 在 Netlify 的 **Site settings -> Environment variables** 新增：
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`

   （不用把 `.env` 上傳到 GitHub，Netlify 會在 build 時自動注入這兩個環境變數。）
4. 觸發部署即可。之後不論是電腦瀏覽器還是手機瀏覽器打開網址，都是同一份 Supabase 資料。

## 五、兩位使用者怎麼改名字 / 換人

打開 `src/users.js`：

```js
export const USERS = [
  { id: "user_a", name: "使用者 A" },
  { id: "user_b", name: "使用者 B" },
];
```

只要改 `name` 就好（顯示名稱），`id` 請維持和 `supabase.sql` 裡 `users` 表的
`id` 一致（`user_a` / `user_b`），否則點餐紀錄會對不起來。

## 六、資料表說明

* **users**：固定兩筆（`user_a`、`user_b`），只用來顯示名稱。
* **meals**：共用菜單。`category` 只能是 `staple`／`meat`／`egg`／`vegetable`／`soup`
  五種之一；`image_url` 是 Supabase Storage 的公開圖片網址；`is_active` 控制是否出現在
  「今日點餐」（停售不影響歷史紀錄）。
* **daily_orders**：每位使用者每天最多一筆，靠 `UNIQUE (user_id, date)` 保證。
  五個分類欄位（`staple`／`meat`／`egg`／`vegetable`／`soup`）都是 JSONB，存的是「當下
  的快照」`{ mealId, name, imageUrl }`，不是只存 `mealId` — 這樣未來餐點改名、停售或被
  刪除，都不會影響已經存在的歷史紀錄；沒選的分類存 `null`。

## 七、關於安全性（請務必了解）

這個 App **沒有使用 Supabase Auth**，前端只用 `anon`/`public` key。`supabase.sql`
裡的 RLS policy 是刻意設成「任何拿得到你的 Supabase URL 和 anon key 的人，都可以讀寫
這三張表和 `meal-images` bucket」。

這代表：

* 這不是真正的身份驗證，兩個「使用者」按鈕只是方便兩人各自使用，**不會**阻止任何人假冒
  另一位使用者、或用 API 直接呼叫 Supabase 讀寫資料。
* 請不要把 Supabase URL / anon key 當成機密隨意公開分享；也絕對不要把
  `service_role`／secret key 放進前端程式碼或提交到 GitHub。
* 這樣的設定適合「家裡兩個人用的小工具」，如果之後想要更嚴謹的存取控制，建議之後
  導入 Supabase Auth（email/密碼或 magic link）並把 RLS policy 改成依登入者身份判斷，
  而不是目前這種「知道網址跟 key 就能用」的簡化版本。

## 八、自我測試檢查表

* [ ] 使用者 A / 使用者 B 都能在啟動畫面選擇身份
* [ ] 重新整理頁面後身份不會消失
* [ ] 可以用「切換使用者」換人
* [ ] 兩支裝置看到的菜單一致；新增/編輯/刪除/停售餐點後，另一台裝置重新整理就看得到
* [ ] 新增餐點的圖片會出現在 Supabase Storage 的 `meal-images` bucket，且其他裝置看得到
* [ ] 每個分類最多選 1 項、可以不選、至少選 1 項才能送出
* [ ] 使用者 A 和使用者 B 同一天都可以各自有一筆訂單，互不覆蓋
* [ ] 「修改今日餐點」只會覆蓋目前這位使用者自己當天的紀錄
* [ ] 歷史紀錄畫面看得出目前是哪位使用者
* [ ] 刪除或停售餐點，不會讓歷史紀錄裡舊有的餐點資料消失或出錯
* [ ] `npm install` 與 `npm run build` 都能順利完成
