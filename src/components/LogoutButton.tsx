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
        className="flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50"
        style={{ color: "rgba(216,214,214,0.6)", fontFamily: "'Montserrat',sans-serif" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(216,214,214,0.6)"; }}
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
      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
      style={{ color: "#d8d6d6", fontFamily: "'Montserrat',sans-serif" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ffffff"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(27,35,170,0.4)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#d8d6d6"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      <LogOut size={18} />
      <span>Uitloggen</span>
    </button>
  );
}
