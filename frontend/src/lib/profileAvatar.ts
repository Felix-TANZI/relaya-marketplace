import type { User } from "@/services/api/auth";

const PROFILE_AVATAR_KEY = "belivay_profile_avatar";

export function getStoredProfileAvatar(): string | null {
  return localStorage.getItem(PROFILE_AVATAR_KEY);
}

export function setStoredProfileAvatar(dataUrl: string | null) {
  if (!dataUrl) {
    localStorage.removeItem(PROFILE_AVATAR_KEY);
    return;
  }

  localStorage.setItem(PROFILE_AVATAR_KEY, dataUrl);
}

export function getUserDisplayName(user: User | null) {
  if (!user) {
    return "Utilisateur";
  }

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return fullName || user.username;
}

export function getUserInitials(user: User | null) {
  const displayName = getUserDisplayName(user);
  const parts = displayName.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return displayName.slice(0, 2).toUpperCase();
}
