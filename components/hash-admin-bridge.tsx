"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function HashAdminBridge() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash?.toLowerCase() ?? "";

    // Suporta links como /#/admin e /#admin
    if (
      hash === "#/admin" ||
      hash === "#admin" ||
      hash.startsWith("#/admin?")
    ) {
      router.replace("/admin");
    }
  }, [router]);

  return null;
}
