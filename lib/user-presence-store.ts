type PresenceEntry = {
  userId: string;
  email?: string;
  lastSeenMs: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __etUserPresenceStore: Map<string, PresenceEntry> | undefined;
}

const _store: Map<string, PresenceEntry> =
  global.__etUserPresenceStore ?? new Map<string, PresenceEntry>();

if (!global.__etUserPresenceStore) {
  global.__etUserPresenceStore = _store;
}

// Janela mais ampla para evitar falso "offline" quando o browser reduz timers em background.
const ONLINE_TTL_MS = 15 * 60 * 1000;

export const userPresenceStore = {
  ping(userId: string, email?: string) {
    _store.set(userId, { userId, email, lastSeenMs: Date.now() });
  },

  get(userId: string): PresenceEntry | null {
    return _store.get(userId) ?? null;
  },

  getByEmail(email: string): PresenceEntry | null {
    const target = email.toLowerCase();
    for (const value of _store.values()) {
      if ((value.email ?? "").toLowerCase() === target) return value;
    }
    return null;
  },

  markOffline(userId: string) {
    const existing = _store.get(userId);
    if (!existing) return;
    _store.set(userId, { ...existing, lastSeenMs: 0 });
  },

  isOnline(userId: string): boolean {
    const item = _store.get(userId);
    if (!item) return false;
    return Date.now() - item.lastSeenMs <= ONLINE_TTL_MS;
  },

  status(userId: string): "online" | "offline" {
    return this.isOnline(userId) ? "online" : "offline";
  },

  lastSeenAt(userId: string): string | null {
    const item = _store.get(userId);
    if (!item) return null;
    return new Date(item.lastSeenMs).toISOString();
  },
};
