/**
 * Supabase-backed data layer.
 *
 * Replaces the old IndexedDB module. All reads/writes go straight to the
 * shared Supabase project, so every device sees the same data. Meal photos
 * are uploaded to the `meal-images` Storage bucket; only the resulting
 * public URL is stored in the `meals` table (never base64).
 *
 * This file also translates between the app's camelCase in-memory shape
 * (used throughout App.jsx) and the database's snake_case columns, so the
 * rest of the app never has to think about the DB schema directly.
 */
import { supabase, MEAL_IMAGE_BUCKET } from "./supabaseClient.js";

const MEALS_TABLE = "meals";
const ORDERS_TABLE = "daily_orders";

/* --------------------------------- meals ---------------------------------- */

function rowToMeal(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    image: row.image_url,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mealToRow(meal) {
  return {
    id: meal.id,
    name: meal.name,
    category: meal.category,
    image_url: meal.image,
    is_active: meal.isActive,
    created_at: meal.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export async function getAllMeals() {
  const { data, error } = await supabase
    .from(MEALS_TABLE)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToMeal);
}

/** Uploads a compressed image blob to Storage and returns its public URL. */
export async function uploadMealImage(blob, mealId) {
  const fileName = `${mealId}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(MEAL_IMAGE_BUCKET)
    .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from(MEAL_IMAGE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function putMeal(meal) {
  const { error } = await supabase
    .from(MEALS_TABLE)
    .upsert(mealToRow(meal), { onConflict: "id" });
  if (error) throw error;
}

/** Deletes the meal row. Best-effort deletes its old Storage image too. */
export async function deleteMealRecord(id, imageUrl) {
  const { error } = await supabase.from(MEALS_TABLE).delete().eq("id", id);
  if (error) throw error;
  if (imageUrl) {
    try {
      const marker = `/${MEAL_IMAGE_BUCKET}/`;
      const idx = imageUrl.indexOf(marker);
      if (idx !== -1) {
        const path = imageUrl.slice(idx + marker.length).split("?")[0];
        if (path) await supabase.storage.from(MEAL_IMAGE_BUCKET).remove([path]);
      }
    } catch (e) {
      /* not critical — app works fine even if the old file lingers */
    }
  }
}

/* --------------------------------- orders --------------------------------- */

function snapshotFromRow(snap) {
  if (!snap) return null;
  return { mealId: snap.mealId, name: snap.name, image: snap.imageUrl };
}

function snapshotToRow(item) {
  if (!item) return null;
  return { mealId: item.mealId, name: item.name, imageUrl: item.image };
}

function rowToOrder(row) {
  return {
    id: row.id,
    date: row.date,
    userId: row.user_id,
    staple: snapshotFromRow(row.staple),
    meat: snapshotFromRow(row.meat),
    egg: snapshotFromRow(row.egg),
    vegetable: snapshotFromRow(row.vegetable),
    soup: snapshotFromRow(row.soup),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All of this user's orders, newest date first. */
export async function getOrdersForUser(userId) {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToOrder);
}

/**
 * Creates or overwrites this user's order for `order.date`. Relies on the
 * UNIQUE(user_id, date) constraint so each user can only ever have one row
 * per day — saving again just updates that same row instead of inserting
 * a second one.
 */
export async function putOrder(order) {
  const row = {
    id: order.id,
    date: order.date,
    user_id: order.userId,
    staple: snapshotToRow(order.staple),
    meat: snapshotToRow(order.meat),
    egg: snapshotToRow(order.egg),
    vegetable: snapshotToRow(order.vegetable),
    soup: snapshotToRow(order.soup),
    created_at: order.createdAt,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from(ORDERS_TABLE)
    .upsert(row, { onConflict: "user_id,date" });
  if (error) throw error;
}
