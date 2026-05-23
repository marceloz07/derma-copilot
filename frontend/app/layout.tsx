// app/layout.tsx — Derma Copilot Frontend
// Root layout — Server Component.
// Importa los estilos globales y envuelve la app con <Providers>
// (el Client boundary que contiene AuthProvider).
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/Providers';

export const metadata: Metadata = {
  title:       'Derma Copilot',
  description: 'Asistente IA para dermatólogos — análisis de casos, consultas y CRM',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
