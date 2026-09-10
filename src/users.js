/**
 * This app is fixed to exactly two users. To rename them, edit USERS below —
 * every screen (login, switch-user, history heading) reads from this file,
 * nothing is hard-coded elsewhere.
 *
 * `id` must match the `id` column of the seeded rows in the `users` table
 * (see supabase.sql). `name` is just the display label shown in the UI.
 */
export const USERS = [
  { id: "user_a", name: "使用者 A" },
  { id: "user_b", name: "使用者 B" },
];

export const CURRENT_USER_STORAGE_KEY = "home-meal-app:current-user-id";

export function getStoredUserId() {
  try {
    const id = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return USERS.some((u) => u.id === id) ? id : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUserId(id) {
  try {
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, id);
  } catch (e) {
    /* ignore (e.g. storage disabled) */
  }
}

export function clearStoredUserId() {
  try {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}
