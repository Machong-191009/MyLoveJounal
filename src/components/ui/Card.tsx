import { cn } from "@/lib/utils";
import { CSSProperties, ReactNode, KeyboardEvent } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
  role?: string;
  tabIndex?: number;
  ariaLabel?: string;
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

export default function Card({
  children,
  className,
  hover = false,
  style,
  role,
  tabIndex,
  ariaLabel,
  onClick,
  onKeyDown,
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--color-bg-card)] rounded-[var(--radius)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]",
        hover && "hover:shadow-[var(--shadow-md)] transition-shadow duration-200",
        className
      )}
      style={style}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
