/**
 * lib/profile-store.ts
 *
 * Reactive store for the logged-in user's display name.
 * Used so that when the account page saves a new name, the sidebar
 * and dashboard greeting update instantly without a page refresh.
 */

type Listener = () => void;

let _name: string | null = null;
const _listeners = new Set<Listener>();

export const profileStore = {
  getName(): string | null {
    // Try memory first, then localStorage cache
    if (_name) return _name;
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("et_display_name");
      if (cached) {
        _name = cached;
        return cached;
      }
    }
    return null;
  },

  setName(name: string) {
    _name = name;
    if (typeof window !== "undefined") {
      localStorage.setItem("et_display_name", name);
    }
    _listeners.forEach((fn) => fn());
  },

  subscribe(fn: Listener): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};
