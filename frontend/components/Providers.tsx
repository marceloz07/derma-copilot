'use client';
// components/Providers.tsx — Derma Copilot Frontend
// Client boundary que envuelve la app con todos los providers.
// Se importa desde app/layout.tsx (Server Component) para respetar
// la separación Server / Client de Next.js App Router.
import { type ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
