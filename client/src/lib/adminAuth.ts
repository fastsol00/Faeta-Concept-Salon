// Admin session stored on window object — survives SPA navigation within the same page load.
// After a full page reload, the admin must log in again (correct security behavior for a static site).

const SESSION_KEY = "__grm_admin__";

export interface AdminSessionData {
  id: number;
  username: string;
  name: string;
  displayName?: string;
  shopAddress?: string;
  shopName?: string;
}

export function setAdminSession(user: AdminSessionData) {
  (window as any)[SESSION_KEY] = user;
}

export function getAdminSession(): AdminSessionData | null {
  return (window as any)[SESSION_KEY] ?? null;
}

export function clearAdminSession() {
  delete (window as any)[SESSION_KEY];
}
