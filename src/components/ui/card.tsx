import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-6 transition-all",
        "bg-blue-900/30 border border-blue-800/50 hover:border-blue-700/70",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
