import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Users,
  RefreshCw,
} from "lucide-react";
import {
  getAllMeals,
  putMeal,
  deleteMealRecord,
  uploadMealImage,
  getOrdersForUser,
  putOrder,
} from "./supabaseApi.js";
import { isSupabaseConfigured } from "./supabaseClient.js";
import {
  USERS,
  getStoredUserId,
  setStoredUserId,
  clearStoredUserId,
} from "./users.js";

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

function compressImageFile(file) {
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("圖片處理失敗"));
              return;
            }
            resolve({ dataUrl, blob });
          },
          "image/jpeg",
          0.72
        );
      };
      img.onerror = () => reject(new Error("圖片讀取失敗"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsDataURL(file);
  });
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

function UserSelectScreen({ users, onSelect }) {
  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6"
      style={{ backgroundColor: COLORS.bg }}
    >
      <div
        className="mb-6 flex items-center justify-center rounded-full"
        style={{ width: 72, height: 72, backgroundColor: COLORS.primaryLight }}
      >
        <Users size={32} color={COLORS.primary} />
      </div>
      <h1 className="mb-1 text-xl font-extrabold" style={{ color: COLORS.ink }}>
        今天是誰點餐？
      </h1>
      <p className="mb-8 text-sm font-semibold" style={{ color: COLORS.muted }}>
        選好之後，下次開啟不用再選一次
      </p>
      <div className="w-full space-y-3">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u.id)}
            className="w-full rounded-2xl py-4 text-base font-extrabold text-white shadow-sm transition-transform active:scale-95"
            style={{ backgroundColor: COLORS.primary }}
          >
            {u.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function CurrentUserBar({ userName, onSwitch }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card }}
    >
      <div className="flex items-center gap-1.5">
        <Users size={15} color={COLORS.primary} />
        <span className="text-sm font-bold" style={{ color: COLORS.ink }}>
          {userName}
        </span>
      </div>
      <button
        onClick={onSwitch}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold"
        style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primaryDark }}
      >
        <RefreshCw size={12} />
        切換使用者
      </button>
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
  const [previewImage, setPreviewImage] = useState(meal?.image || "");
  const [pendingBlob, setPendingBlob] = useState(null);
  const [isActive, setIsActive] = useState(meal ? meal.isActive : true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { dataUrl, blob } = await compressImageFile(file);
      setPreviewImage(dataUrl);
      setPendingBlob(blob);
    } catch (err) {
      setError("圖片處理失敗，請再試一次");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("請輸入餐點名稱");
      return;
    }
    if (!previewImage) {
      setError("請上傳一張餐點圖片");
      return;
    }
    setError("");
    try {
      await onSave({
        id: meal?.id || generateId("meal"),
        name: name.trim(),
        category,
        isActive,
        createdAt: meal?.createdAt || Date.now(),
        imageBlob: pendingBlob,
        existingImageUrl: meal?.image || null,
      });
    } catch (err) {
      setError("儲存失敗，請確認網路連線後再試一次");
    }
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
              ) : previewImage ? (
                <img src={previewImage} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <Camera size={26} color={COLORS.muted} />
              )}
            </div>
            <label
              className="cursor-pointer rounded-2xl px-4 py-2.5 text-sm font-bold"
              style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primaryDark }}
            >
              {previewImage ? "更換圖片" : "上傳圖片"}
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

function HistoryPage({ orders, onOpen, userName }) {
  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="mb-4 text-2xl font-extrabold" style={{ color: COLORS.ink }}>
        {userName ? `${userName} 的歷史紀錄` : "歷史紀錄"}
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
  const [currentUserId, setCurrentUserId] = useState(getStoredUserId);
  const [loading, setLoading] = useState(() => Boolean(getStoredUserId()));
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
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

  const todayModeRef = useRef(todayMode);
  useEffect(() => {
    todayModeRef.current = todayMode;
  }, [todayMode]);

  // Full load whenever the signed-in user changes (or a retry is requested).
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [loadedMeals, loadedOrders] = await Promise.all([
          getAllMeals(),
          getOrdersForUser(currentUserId),
        ]);
        if (cancelled) return;
        const tKey = todayKey();
        const existing = loadedOrders.find((o) => o.date === tKey) || null;

        setMeals(loadedMeals);
        setOrders(loadedOrders);
        setTodayOrder(existing);
        setTodayMode(existing ? "view" : "edit");
        setSelection({
          staple: existing?.staple?.mealId || null,
          meat: existing?.meat?.mealId || null,
          egg: existing?.egg?.mealId || null,
          vegetable: existing?.vegetable?.mealId || null,
          soup: existing?.soup?.mealId || null,
        });
        setLoadError(false);
      } catch (e) {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, retryTick]);

  // Light background refresh when switching tabs, so changes made on other
  // devices show up without needing a full realtime subscription. Won't
  // clobber an in-progress (unsaved) selection on the today page.
  useEffect(() => {
    if (!currentUserId) return;
    if (page === "manage") {
      getAllMeals().then(setMeals).catch(() => {});
    } else if (page === "history") {
      getOrdersForUser(currentUserId).then(setOrders).catch(() => {});
    } else if (page === "today") {
      getAllMeals().then(setMeals).catch(() => {});
      getOrdersForUser(currentUserId)
        .then((loadedOrders) => {
          setOrders(loadedOrders);
          if (todayModeRef.current !== "view") return;
          const tKey = todayKey();
          const existing = loadedOrders.find((o) => o.date === tKey) || null;
          setTodayOrder(existing);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSelectUser = useCallback((id) => {
    setStoredUserId(id);
    setCurrentUserId(id);
  }, []);

  const handleSwitchUser = useCallback(() => {
    clearStoredUserId();
    setCurrentUserId(null);
    setPage("today");
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    setSubmitting(true);
    try {
      const order = {
        id: todayOrder?.id || generateId("order"),
        date: todayKey(),
        userId: currentUserId,
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
  }, [meals, selection, todayOrder, currentUserId]);

  const handleSaveMeal = useCallback(async (formResult) => {
    setSavingMeal(true);
    try {
      let imageUrl = formResult.existingImageUrl;
      if (formResult.imageBlob) {
        imageUrl = await uploadMealImage(formResult.imageBlob, formResult.id);
      }
      const mealData = {
        id: formResult.id,
        name: formResult.name,
        category: formResult.category,
        image: imageUrl,
        isActive: formResult.isActive,
        createdAt: formResult.createdAt,
      };
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
    await deleteMealRecord(deleteTarget.id, deleteTarget.image);
    setMeals((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  }, [deleteTarget]);

  if (!isSupabaseConfigured) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <p className="text-sm font-bold" style={{ color: COLORS.danger }}>
          尚未設定 Supabase 連線資訊
        </p>
        <p className="text-xs font-semibold" style={{ color: COLORS.muted }}>
          請設定環境變數 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY
          （本機開發請建立 .env，Netlify 請於 Environment variables 設定）。
        </p>
      </div>
    );
  }

  if (!currentUserId) {
    return <UserSelectScreen users={USERS} onSelect={handleSelectUser} />;
  }

  const currentUser = USERS.find((u) => u.id === currentUserId);

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

  if (loadError) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <p className="text-sm font-semibold" style={{ color: COLORS.danger }}>
          無法連線到雲端資料庫，請確認網路連線與 Supabase 設定後再試一次。
        </p>
        <button
          onClick={() => setRetryTick((t) => t + 1)}
          className="rounded-2xl px-5 py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: COLORS.primary }}
        >
          重新整理
        </button>
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
      <CurrentUserBar userName={currentUser?.name} onSwitch={handleSwitchUser} />

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
        <HistoryPage
          orders={orders}
          onOpen={(o) => setHistoryDetail(o)}
          userName={currentUser?.name}
        />
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

