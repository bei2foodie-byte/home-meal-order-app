/**
 * IndexedDB persistence layer for the home meal ordering app.
 *
 * This is plain browser-native IndexedDB — no external libraries, no
 * Claude-preview-only APIs. It works in any modern desktop or mobile
 * browser, persists across page reloads, and survives the browser being
 * fully closed and reopened.
 *
 * Two object stores:
 *  - "meals": one record per meal (id, name, category, image, isActive, createdAt)
 *  - "orders": one record per day (keyed by date "YYYY-MM-DD")
 *
 * Meal photos are stored as compressed base64 data URLs directly inside
 * the meal / order records, so no separate blob handling is required.
 */

const DB_NAME = "home-meal-order-db";
const DB_VERSION = 1;
const MEALS_STORE = "meals";
const ORDERS_STORE = "orders";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("此瀏覽器不支援 IndexedDB"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(MEALS_STORE)) {
        db.createObjectStore(MEALS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ORDERS_STORE)) {
        db.createObjectStore(ORDERS_STORE, { keyPath: "date" });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject(event.target.error || new Error("無法開啟資料庫"));
    };
  });

  return dbPromise;
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runWrite(storeName, run) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        run(tx.objectStore(storeName));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

/* --------------------------------- meals --------------------------------- */

export async function getAllMeals() {
  const db = await openDB();
  const tx = db.transaction(MEALS_STORE, "readonly");
  const result = await promisifyRequest(tx.objectStore(MEALS_STORE).getAll());
  return result || [];
}

export async function putMeal(meal) {
  await runWrite(MEALS_STORE, (store) => store.put(meal));
}

export async function deleteMealRecord(id) {
  await runWrite(MEALS_STORE, (store) => store.delete(id));
}

/* --------------------------------- orders --------------------------------- */

export async function getAllOrders() {
  const db = await openDB();
  const tx = db.transaction(ORDERS_STORE, "readonly");
  const result = await promisifyRequest(tx.objectStore(ORDERS_STORE).getAll());
  return (result || []).sort((a, b) => b.date.localeCompare(a.date));
}

export async function putOrder(order) {
  await runWrite(ORDERS_STORE, (store) => store.put(order));
}

export async function getOrderByDate(date) {
  const db = await openDB();
  const tx = db.transaction(ORDERS_STORE, "readonly");
  const result = await promisifyRequest(tx.objectStore(ORDERS_STORE).get(date));
  return result || null;
}
