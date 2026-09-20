/**
 * Safe wrapper for localStorage and sessionStorage to prevent crashes in
 * iOS Safari Private Browsing, in-app WebViews (Zalo, Messenger), or restricted environments
 * where accessing storage throws SecurityError or QuotaExceededError.
 */

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`safeStorage: failed to read '${key}'`, e);
    }
    return null;
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`safeStorage: failed to write '${key}'`, e);
    }
    return false;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`safeStorage: failed to remove '${key}'`, e);
    }
  },
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`safeSessionStorage: failed to read '${key}'`, e);
    }
    return null;
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`safeSessionStorage: failed to write '${key}'`, e);
    }
    return false;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`safeSessionStorage: failed to remove '${key}'`, e);
    }
  },
};
