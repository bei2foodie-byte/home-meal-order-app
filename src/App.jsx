import React, { useState, useEffect, useCallback } from "react";
import {
  Home,
  ChefHat,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Camera,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  getAllMeals,
  putMeal,
  deleteMealRecord,
  getAllOrders,
  putOrder,
} from "./db.js";

/* ----------------------------- design tokens ----------------------------- */
const COLORS = {
  bg: "#FFFBF3",
  card: "#FFFFFF",
  primary: "#4F7A5B",
  primaryDark: "#3D6249",
  primaryLight: "#EAF2EB",
  accent: "#F4B942",
  accentDark: "#C98F1C",
  ink: "#3A332C",
  muted: "#9A8F84",
  border: "#EFE7DA",
  danger: "#D1495B",
  dangerLight: "#FBEAEC",
  disabled: "#E4DDD1",
};

const CATEGORIES = [
  { key: "staple", label: "主食", emoji: "🍚" },
  { key: "meat", label: "肉", emoji: "🍗" },
  { key: "egg", label: "蛋", emoji: "🍳" },
  { key: "vegetable", label: "菜", emoji: "🥬" },
  { key: "soup", label: "湯品", emoji: "🍲" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

/* ------------------------------- utilities -------------------------------- */
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function displayDate(key) {
  return key.replaceAll("-", " / ");
}

function makePlaceholderImage(emoji, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <rect width="300" height="300" rx="28" fill="${bg}"/>
    <text x="50%" y="54%" font-size="120" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 640;
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => reject(new Error("圖片讀取失敗"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsDataURL(file);
  });
}

function createSeedMeals() {
  const now = Date.now();
  const items = [
    ["staple", "白飯", "#F4E7C9"],
    ["staple", "地瓜飯", "#EFD9A8"],
    ["meat", "香煎雞腿", "#F1D3C0"],
    ["meat", "紅燒排骨", "#E9C3B0"],
    ["egg", "荷包蛋", "#FBEFC7"],
    ["egg", "番茄炒蛋", "#F7D9B0"],
    ["vegetable", "炒高麗菜", "#DCEBCB"],
    ["vegetable", "燙青花菜", "#CFE6C4"],
    ["soup", "玉米濃湯", "#FBE7B8"],
    ["soup", "味噌湯", "#E3D3B8"],
  ];
  return items.map(([category, name, bg], i) => ({
    id: generateId("meal"),
    name,
    category,
    image: makePlaceholderImage(
      CATEGORIES.find((c) => c.key === category).emoji,
      bg
    ),
    isActive: true,
    createdAt: now + i,
  }));
}

/* -------------------------------- pieces ---------------------------------- */
function ToggleSwitch({ active, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex items-center rounded-full transition-colors"
      style={{
        width: 44,
        height: 26,
        backgroundColor: active ? COLORS.primary : COLORS.disabled,
        flexShrink: 0,
      }}
      aria-pressed={active}
    >
      <span
        className="inline-block rounded-full bg-white shadow transition-transform"
        style={{
          width: 20,
          height: 20,
          transform: active ? "translateX(21px)" : "translateX(3px)",
        }}
      />
    </button>
  );
}

function MealCard({ meal, selected, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-shrink-0 snap-start flex-col items-stretch overflow-hidden rounded-2xl text-left transition-transform active:scale-95"
      style={{
        width: 116,
        backgroundColor: COLORS.card,
        border: selected ? `3px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="relative w-full" style={{ height: 108 }}>
        <img
          src={meal.image}
          alt={meal.name}
          className="h-full w-full object-cover"
        />
        {selected && (
          <div
            className="absolute right-2 top-2 flex items-center justify-center rounded-full"
            style={{ width: 24, height: 24, backgroundColor: COLORS.primary }}
          >
            <Check size={14} color="#fff" strokeWidth={3} />
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p
          className="truncate text-sm font-bold"
          style={{ color: selected ? COLORS.primaryDark : COLORS.ink }}
        >
          {meal.name}
        </p>
      </div>
    </button>
  );
}

function BottomNav({ page, setPage }) {
  const items = [
    { key: "today", label: "今日點餐", icon: Home },
    { key: "manage", label: "餐點管理", icon: ChefHat },
    { key: "history", label: "歷史紀錄", icon: CalendarDays },
  ];
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex w-full max-w-md items-stretch justify-around"
      style={{
        backgroundColor: COLORS.card,
        borderTop: `1px solid ${COLORS.border}`,
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}
    >
      {items.map(({ key, label, icon: Icon }) => {
        const active = page === key;
        return (
          <button
            key={key}
            onClick={() => setPage(key)}
            className="flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            <Icon
              size={22}
              color={active ? COLORS.primary : COLORS.muted}
              strokeWidth={active ? 2.4 : 2}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: active ? COLORS.primary : COLORS.muted }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ModalShell({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ backgroundColor: "rgba(58,51,44,0.45)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ backgroundColor: COLORS.card, maxHeight: "85vh" }}
      >
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ title, lines, confirmLabel, danger, onCancel, onConfirm, busy }) {
  return (
    <ModalShell onClose={onCancel}>
      <div className="p-5">
        <h3 className="mb-3 text-lg font-bold" style={{ color: COLORS.ink }}>
          {title}
        </h3>
        {lines && (
          <div
            className="mb-4 space-y-1.5 rounded-2xl p-4"
            style={{ backgroundColor: COLORS.primaryLight }}
          >
            {lines.map((l, i) => (
              <p key={i} className="text-sm" style={{ color: COLORS.ink }}>
                {l}
              </p>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl py-3 text-sm font-bold"
            style={{ backgroundColor: COLORS.disabled, color: COLORS.ink }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white"
            style={{ backgroundColor: danger ? COLORS.danger : COLORS.primary }}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function MealFormModal({ meal, defaultCategory, onCancel, onSave, busy }) {
  const [name, setName] = useState(meal?.name || "");
  const [category, setCategory] = useState(meal?.category || defaultCategory);
  const [image, setImage] = useState(meal?.image || "");
  const [isActive, setIsActive] = useState(meal ? meal.isActive : true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const dataUrl = await compressImage(file);
      setImage(dataUrl);
    } catch (err) {
      setError("圖片上傳失敗，請再試一次");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("請輸入餐點名稱");
      return;
    }
    if (!image) {
      setError("請上傳一張餐點圖片");
      return;
    }
    setError("");
    onSave({
      id: meal?.id || generateId("meal"),
      name: name.trim(),
      category,
      image,
      isActive,
      createdAt: meal?.createdAt || Date.now(),
    });
  };

  return (
    <ModalShell onClose={onCancel}>
      <div className="p-5">
        <h3 className="mb-4 text-lg font-bold" style={{ color: COLORS.ink }}>
          {meal ? "編輯餐點" : "新增餐點"}
        </h3>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-xs font-bold" style={{ color: COLORS.muted }}>
            餐點圖片
          </span>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center overflow-hidden rounded-2xl"
              style={{ width: 88, height: 88, backgroundColor: COLORS.primaryLight }}
            >
              {uploading ? (
                <Loader2 size={20} className="animate-spin" color={COLORS.primary} />
              ) : image ? (
                <img src={image} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <Camera size={26} color={COLORS.muted} />
              )}
            </div>
            <label
              className="cursor-pointer rounded-2xl px-4 py-2.5 text-sm font-bold"
              style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primaryDark }}
            >
              {image ? "更換圖片" : "上傳圖片"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </label>
          </div>
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-xs font-bold" style={{ color: COLORS.muted }}>
            餐點名稱
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：香煎雞腿"
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
          />
        </label>

        <div className="mb-3">
          <span className="mb-1.5 block text-xs font-bold" style={{ color: COLORS.muted }}>
            餐點分類
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className="rounded-full px-3.5 py-2 text-sm font-bold"
                style={{
                  backgroundColor: category === c.key ? COLORS.primary : COLORS.primaryLight,
                  color: category === c.key ? "#fff" : COLORS.primaryDark,
                }}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}` }}
        >
          <span className="text-sm font-bold" style={{ color: COLORS.ink }}>
            {isActive ? "啟用中" : "已停售"}
          </span>
          <ToggleSwitch active={isActive} onToggle={() => setIsActive((v) => !v)} />
        </div>

        {error && (
          <p className="mb-3 text-sm font-semibold" style={{ color: COLORS.danger }}>
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl py-3 text-sm font-bold"
            style={{ backgroundColor: COLORS.disabled, color: COLORS.ink }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white"
            style={{ backgroundColor: COLORS.primary }}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            儲存餐點
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* --------------------------------- pages ----------------------------------- */
function TodayPage({ meals, todayOrder, mode, setMode, selection, setSelection, onSubmit, setPage, setManageCategory }) {
  const hasAnySelection = CATEGORIES.some((c) => selection[c.key]);

  const toggle = (catKey, mealId) => {
    setSelection((prev) => ({
      ...prev,
      [catKey]: prev[catKey] === mealId ? null : mealId,
    }));
  };

  return (
    <div className="px-4 pb-28 pt-6">
      <h1 className="text-2xl font-extrabold" style={{ color: COLORS.ink }}>
        今日點餐
      </h1>
      <p className="mb-5 mt-1 text-sm font-semibold" style={{ color: COLORS.muted }}>
        {displayDate(todayKey())}
      </p>

      {mode === "view" && todayOrder ? (
        <div>
          <div
            className="mb-5 rounded-3xl p-4"
            style={{ backgroundColor: COLORS.primaryLight }}
          >
            <p className="mb-3 text-base font-extrabold" style={{ color: COLORS.primaryDark }}>
              今天吃這些 ♡
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => {
                const item = todayOrder[c.key];
                if (!item) return null;
                return (
                  <div
                    key={c.key}
                    className="overflow-hidden rounded-2xl"
                    style={{ backgroundColor: COLORS.card }}
                  >
                    <img src={item.image} alt={item.name} className="h-24 w-full object-cover" />
                    <div className="px-2.5 py-2">
                      <p className="text-xs font-semibold" style={{ color: COLORS.muted }}>
                        {c.emoji} {c.label}
                      </p>
                      <p className="truncate text-sm font-bold" style={{ color: COLORS.ink }}>
                        {item.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => setMode("edit")}
            className="w-full rounded-2xl py-3.5 text-sm font-bold"
            style={{ backgroundColor: COLORS.card, color: COLORS.primaryDark, border: `2px solid ${COLORS.primary}` }}
          >
            修改今日餐點
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
          {CATEGORIES.map((c) => {
            const catMeals = meals.filter((m) => m.category === c.key && (m.isActive || m.id === selection[c.key]));
            return (
              <div key={c.key}>
                <p className="mb-2 text-sm font-extrabold" style={{ color: COLORS.ink }}>
                  {c.emoji} {c.label}
                </p>
                {catMeals.length === 0 ? (
                  <button
                    onClick={() => {
                      setManageCategory(c.key);
                      setPage("manage");
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-semibold"
                    style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primaryDark }}
                  >
                    尚未新增此分類餐點，點此新增
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <div
                    className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1"
                    style={{
                      scrollSnapType: "x mandatory",
                      WebkitOverflowScrolling: "touch",
                      scrollBehavior: "smooth",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    {catMeals.map((m) => (
                      <MealCard
                        key={m.id}
                        meal={m}
                        selected={selection[c.key] === m.id}
                        onClick={() => toggle(c.key, m.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {todayOrder && (
            <button
              onClick={() => {
                setMode("view");
                setSelection({
                  staple: todayOrder.staple?.mealId || null,
                  meat: todayOrder.meat?.mealId || null,
                  egg: todayOrder.egg?.mealId || null,
                  vegetable: todayOrder.vegetable?.mealId || null,
                  soup: todayOrder.soup?.mealId || null,
                });
              }}
              className="w-full text-center text-sm font-semibold underline"
              style={{ color: COLORS.muted }}
            >
              取消修改
            </button>
          )}

          <div
            className="fixed bottom-16 left-0 right-0 z-20 mx-auto w-full max-w-md px-4 pb-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
          >
            <button
              onClick={onSubmit}
              disabled={!hasAnySelection}
              className="w-full rounded-2xl py-3.5 text-base font-extrabold text-white shadow-lg"
              style={{ backgroundColor: hasAnySelection ? COLORS.primary : COLORS.disabled }}
            >
              確認今日餐點
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagePage({ meals, category, setCategory, onAdd, onEdit, onToggleActive, onDelete }) {
  const list = meals
    .filter((m) => m.category === category)
    .sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="mb-4 text-2xl font-extrabold" style={{ color: COLORS.ink }}>
        餐點管理
      </h1>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-bold"
            style={{
              backgroundColor: category === c.key ? COLORS.primary : COLORS.primaryLight,
              color: category === c.key ? "#fff" : COLORS.primaryDark,
            }}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <button
        onClick={onAdd}
        className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-extrabold text-white"
        style={{ backgroundColor: COLORS.accentDark }}
      >
        <Plus size={18} /> 新增餐點
      </button>

      {list.length === 0 ? (
        <p className="py-10 text-center text-sm font-semibold" style={{ color: COLORS.muted }}>
          此分類尚無餐點，新增一個吧！
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <img
                src={m.image}
                alt={m.name}
                className="rounded-xl object-cover"
                style={{ width: 60, height: 60 }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold" style={{ color: COLORS.ink }}>
                  {m.name}
                </p>
                <span
                  className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: m.isActive ? COLORS.primaryLight : COLORS.dangerLight,
                    color: m.isActive ? COLORS.primaryDark : COLORS.danger,
                  }}
                >
                  {m.isActive ? "啟用中" : "已停售"}
                </span>
              </div>
              <ToggleSwitch active={m.isActive} onToggle={() => onToggleActive(m)} />
              <button
                onClick={() => onEdit(m)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 34, height: 34, backgroundColor: COLORS.primaryLight }}
              >
                <Pencil size={15} color={COLORS.primaryDark} />
              </button>
              <button
                onClick={() => onDelete(m)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 34, height: 34, backgroundColor: COLORS.dangerLight }}
              >
                <Trash2 size={15} color={COLORS.danger} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryPage({ orders, onOpen }) {
  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="mb-4 text-2xl font-extrabold" style={{ color: COLORS.ink }}>
        歷史紀錄
      </h1>
      {orders.length === 0 ? (
        <p className="py-10 text-center text-sm font-semibold" style={{ color: COLORS.muted }}>
          尚未有點餐紀錄
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => onOpen(o)}
              className="block w-full rounded-2xl p-4 text-left"
              style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-extrabold" style={{ color: COLORS.ink }}>
                  {displayDate(o.date)}
                </p>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>
              <div className="space-y-0.5">
                {CATEGORIES.map((c) =>
                  o[c.key] ? (
                    <p key={c.key} className="text-xs font-semibold" style={{ color: COLORS.muted }}>
                      {c.label}｜<span style={{ color: COLORS.ink }}>{o[c.key].name}</span>
                    </p>
                  ) : null
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryDetailModal({ order, onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold" style={{ color: COLORS.ink }}>
            {displayDate(order.date)}
          </h3>
          <button onClick={onClose}>
            <X size={20} color={COLORS.muted} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => {
            const item = order[c.key];
            if (!item) return null;
            return (
              <div key={c.key} className="overflow-hidden rounded-2xl" style={{ backgroundColor: COLORS.bg }}>
                <img src={item.image} alt={item.name} className="h-24 w-full object-cover" />
                <div className="px-2.5 py-2">
                  <p className="text-xs font-semibold" style={{ color: COLORS.muted }}>
                    {c.emoji} {c.label}
                  </p>
                  <p className="truncate text-sm font-bold" style={{ color: COLORS.ink }}>
                    {item.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------------------------- app ------------------------------------ */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [page, setPage] = useState("today");

  const [meals, setMeals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [todayOrder, setTodayOrder] = useState(null);
  const [todayMode, setTodayMode] = useState("edit");
  const [selection, setSelection] = useState({
    staple: null,
    meat: null,
    egg: null,
    vegetable: null,
    soup: null,
  });
  const [showConfirmOrder, setShowConfirmOrder] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [manageCategory, setManageCategory] = useState("staple");
  const [showMealForm, setShowMealForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savingMeal, setSavingMeal] = useState(false);

  const [historyDetail, setHistoryDetail] = useState(null);

  useEffect(() => {
    (async () => {
      if (!window.indexedDB) {
        setStorageError(true);
        setLoading(false);
        return;
      }
      try {
        let loadedMeals = await getAllMeals();
        if (loadedMeals.length === 0) {
          const seed = createSeedMeals();
          for (const m of seed) {
            await putMeal(m);
          }
          loadedMeals = seed;
        }
        const loadedOrders = await getAllOrders();
        const tKey = todayKey();
        const existing = loadedOrders.find((o) => o.date === tKey) || null;

        setMeals(loadedMeals);
        setOrders(loadedOrders);
        setTodayOrder(existing);
        setTodayMode(existing ? "view" : "edit");
        if (existing) {
          setSelection({
            staple: existing.staple?.mealId || null,
            meat: existing.meat?.mealId || null,
            egg: existing.egg?.mealId || null,
            vegetable: existing.vegetable?.mealId || null,
            soup: existing.soup?.mealId || null,
          });
        }
      } catch (e) {
        setStorageError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    setSubmitting(true);
    try {
      const order = {
        id: todayOrder?.id || generateId("order"),
        date: todayKey(),
        createdAt: todayOrder?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      CATEGORIES.forEach((c) => {
        const meal = meals.find((m) => m.id === selection[c.key]);
        order[c.key] = meal
          ? { mealId: meal.id, name: meal.name, image: meal.image }
          : null;
      });
      await putOrder(order);
      setOrders((prev) => {
        const rest = prev.filter((o) => o.date !== order.date);
        return [order, ...rest].sort((a, b) => b.date.localeCompare(a.date));
      });
      setTodayOrder(order);
      setTodayMode("view");
      setShowConfirmOrder(false);
    } finally {
      setSubmitting(false);
    }
  }, [meals, selection, todayOrder]);

  const handleSaveMeal = useCallback(async (mealData) => {
    setSavingMeal(true);
    try {
      await putMeal(mealData);
      setMeals((prev) => {
        const exists = prev.some((m) => m.id === mealData.id);
        return exists
          ? prev.map((m) => (m.id === mealData.id ? mealData : m))
          : [...prev, mealData];
      });
      setShowMealForm(false);
      setEditingMeal(null);
    } finally {
      setSavingMeal(false);
    }
  }, []);

  const handleToggleActive = useCallback(async (meal) => {
    const updated = { ...meal, isActive: !meal.isActive };
    await putMeal(updated);
    setMeals((prev) => prev.map((m) => (m.id === meal.id ? updated : m)));
  }, []);

  const handleDeleteMeal = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMealRecord(deleteTarget.id);
    setMeals((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  }, [deleteTarget]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <Loader2 size={28} className="animate-spin" color={COLORS.primary} />
      </div>
    );
  }

  if (storageError) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6 text-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <p className="text-sm font-semibold" style={{ color: COLORS.danger }}>
          目前無法使用儲存功能，請確認裝置支援後再試一次。
        </p>
      </div>
    );
  }

  const confirmLines = CATEGORIES.map((c) => {
    const meal = meals.find((m) => m.id === selection[c.key]);
    return `${c.label}：${meal ? meal.name : "未選"}`;
  });

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-md"
      style={{ backgroundColor: COLORS.bg, fontFamily: "system-ui, -apple-system, 'PingFang TC', 'Noto Sans TC', sans-serif" }}
    >
      {page === "today" && (
        <TodayPage
          meals={meals}
          todayOrder={todayOrder}
          mode={todayMode}
          setMode={setTodayMode}
          selection={selection}
          setSelection={setSelection}
          onSubmit={() => setShowConfirmOrder(true)}
          setPage={setPage}
          setManageCategory={setManageCategory}
        />
      )}

      {page === "manage" && (
        <ManagePage
          meals={meals}
          category={manageCategory}
          setCategory={setManageCategory}
          onAdd={() => {
            setEditingMeal(null);
            setShowMealForm(true);
          }}
          onEdit={(m) => {
            setEditingMeal(m);
            setShowMealForm(true);
          }}
          onToggleActive={handleToggleActive}
          onDelete={(m) => setDeleteTarget(m)}
        />
      )}

      {page === "history" && (
        <HistoryPage orders={orders} onOpen={(o) => setHistoryDetail(o)} />
      )}

      <BottomNav page={page} setPage={setPage} />

      {showConfirmOrder && (
        <ConfirmDialog
          title="今日餐點"
          lines={confirmLines}
          confirmLabel="確認送出"
          onCancel={() => setShowConfirmOrder(false)}
          onConfirm={handleSubmitOrder}
          busy={submitting}
        />
      )}

      {showMealForm && (
        <MealFormModal
          meal={editingMeal}
          defaultCategory={manageCategory}
          onCancel={() => {
            setShowMealForm(false);
            setEditingMeal(null);
          }}
          onSave={handleSaveMeal}
          busy={savingMeal}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="確定要刪除這個餐點嗎？"
          lines={[deleteTarget.name]}
          confirmLabel="確定刪除"
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteMeal}
        />
      )}

      {historyDetail && (
        <HistoryDetailModal order={historyDetail} onClose={() => setHistoryDetail(null)} />
      )}
    </div>
  );
}
