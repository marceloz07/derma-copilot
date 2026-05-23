// components/ui/Card.tsx — Derma Copilot Frontend
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
