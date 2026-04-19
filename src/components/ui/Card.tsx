import { cn } from "@/lib/utils";
import { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
}

export default function Card({ children, className, hover = false, style }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--color-bg-card)] rounded-[var(--radius)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]",
        hover && "hover:shadow-[var(--shadow-md)] transition-shadow duration-200",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
