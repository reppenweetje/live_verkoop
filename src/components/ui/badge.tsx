import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}

const variantStyles = {
  default: "bg-blue-900/30 text-blue-200 border border-blue-700",
  success: "bg-emerald-900/30 text-emerald-300 border border-emerald-800",
  warning: "bg-amber-900/30 text-amber-300 border border-amber-800",
  danger: "bg-red-900/30 text-red-300 border border-red-800",
  info: "bg-blue-600/20 text-blue-300 border border-blue-600",
};

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
