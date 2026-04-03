"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        title="Uitloggen"
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
      >
        <LogOut size={14} />
        Uitloggen
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-900/50 rounded-lg transition-colors disabled:opacity-50"
    >
      <LogOut size={18} />
      <span className="text-sm font-medium">Uitloggen</span>
    </button>
  );
}
