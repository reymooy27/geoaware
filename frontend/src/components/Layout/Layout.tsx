import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useUserStore } from '../../hooks/useStores';
import { cn } from '../../utils/helpers';
import {
  Home, AlertTriangle, Map, Download, Settings, Menu, X, Sun, Moon, Monitor, User, LogOut, Bell, ShieldCheck
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Beranda', icon: Home },
  { path: '/risk', label: 'Cek Risiko', icon: ShieldCheck },
  { path: '/alerts', label: 'Peringatan', icon: AlertTriangle },
  { path: '/offline', label: 'Offline', icon: Download },
  { path: '/settings', label: 'Pengaturan', icon: Settings },
];

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, setUser } = useUserStore();

  const toggleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % 3]);
  };

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };
  const ThemeIcon = themeIcons[theme];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <NavLink to="/" className="flex items-center gap-2" aria-label="GeoAware Home">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-gray-900 dark:text-gray-100 hidden sm:block">GeoAware</span>
              </NavLink>

              <div className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1" role="tablist">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      role="tab"
                      aria-selected={isActive}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={`Tema saat ini: ${theme}. Klik untuk mengubah.`}
              >
                <ThemeIcon className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Notifikasi"
              >
                <Bell className="w-5 h-5" aria-hidden="true" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.name || 'Pengguna'}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name || 'Pengguna'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <NavLink
                      to="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Pengaturan
                    </NavLink>
                    <button
                      onClick={() => { setUser(null); setUserMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700 animate-in">
              <div className="flex flex-col gap-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1" role="main">
        <Outlet />
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2024 GeoAware. Data patahan dari BMKG, Badan Geologi, & OpenStreetMap.</p>
          <p className="mt-1">Aplikasi peringatan dini gempa untuk keamanan Anda dan keluarga.</p>
        </div>
      </footer>
    </div>
  );
}