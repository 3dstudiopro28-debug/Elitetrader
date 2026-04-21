import { useEffect } from "react";
import { userStore, CRMUser } from "@/lib/user-store";

/**
 * Sincroniza o estado dos usuários entre abas/janelas usando o evento 'storage'.
 * Chame useSyncUsers(setUsers) no componente que mantém o estado dos usuários.
 */
export function useSyncUsers(setUsers: (users: CRMUser[]) => void) {
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === "crm-users") {
        setUsers(userStore.getAll());
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [setUsers]);
}
