import { type ClassValue, clsx } from "clsx";
import path from "path";

// Simple clsx-like utility (without clsx dep)
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

export function getUploadDir() {
  return path.join(process.cwd(), UPLOAD_DIR);
}

export function getThumbDir() {
  return path.join(getUploadDir(), "thumbs");
}

/**
 * Generate a random invite code (6 chars alphanumeric uppercase)
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Calculate the number of days between two dates
 */
export function daysBetween(start: Date, end: Date = new Date()): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Format a date to YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Format a date for display (Chinese locale)
 */
export function formatDateDisplay(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get days until next occurrence of a recurring date
 */
export function daysUntilNext(
  date: Date | string,
  repeatType: string = "yearly"
): number {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (repeatType === "once") {
    return daysBetween(today, d);
  }

  if (repeatType === "yearly") {
    let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) {
      next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
    }
    return daysBetween(today, next);
  }

  if (repeatType === "monthly") {
    let next = new Date(today.getFullYear(), today.getMonth(), d.getDate());
    if (next < today) {
      next = new Date(today.getFullYear(), today.getMonth() + 1, d.getDate());
    }
    return daysBetween(today, next);
  }

  return 0;
}
