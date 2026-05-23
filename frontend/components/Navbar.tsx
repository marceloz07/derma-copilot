'use client';
// components/Navbar.tsx — Derma Copilot Frontend
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

const NAV_LINKS = [
  { href: '/dashboard',                    label: 'Inicio' },
  { href: '/dashboard/pacientes',          label: 'Pacientes' },
  { href: '/dashboard/casos',              label: 'Casos' },
  { href: '/dashboard/reportes',           label: 'Reportes' },
  { href: '/dashboard/negocio',            label: '💼 Negocio' },
  { href: '/dashboard/automatizaciones',   label: '⚡ Automatizar' },
];

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-blue-700 text-lg shrink-0"
          >
            <span className="text-2xl" aria-hidden="true">🩺</span>
            <span>Derma Copilot</span>
          </Link>

          {/* Nav links — solo en pantallas medianas+ */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  ].join(' ')}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Perfil + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium text-gray-900">
                Dr. {user?.nombre}{user?.apellido ? ` ${user.apellido}` : ''}
              </span>
              <span className="text-xs text-gray-400 capitalize">{user?.planSuscripcion}</span>
            </div>

            {/* Avatar placeholder */}
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.nombre?.[0]?.toUpperCase() ?? '?'}
            </div>

            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors px-2 py-1 rounded"
              aria-label="Cerrar sesión"
            >
              Salir
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
