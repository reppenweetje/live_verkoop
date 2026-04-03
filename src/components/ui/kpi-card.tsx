import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: "emerald" | "amber" | "red" | "blue" | "violet" | "yellow" | "gold";
  className?: string;
}

const accentColors = {
  emerald: "text-emerald-400 bg-emerald-900/20",
  amber: "text-amber-400 bg-amber-900/20",
  red: "text-red-400 bg-red-900/20",
  blue: "text-blue-400 bg-blue-900/20",
  violet: "text-violet-400 bg-violet-900/20",
  yellow: "text-yellow-400 bg-yellow-900/20",
  gold: "text-amber-300 bg-amber-900/20",
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = "violet",
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        "kpi-card",
        className
      )}
    >
      <div className="flex items-start justify-between">
        {/* Left Section */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-white">{value}</p>
            {trend && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.isPositive ? "text-emerald-400" : "text-red-400"
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Right Section - Icon */}
        {Icon && (
          <div
            className={cn(
              "p-3 rounded-lg",
              accentColors[accentColor]
            )}
          >
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
