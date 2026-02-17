
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, RefreshCw, Home, FolderTree, Layers, Wallet, Database, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';
import { Logo } from './Logo';

const ENTIDADES_PATHS = ['/categorias', '/envelopes', '/tipos-envelope'];
const DASHBOARDS_PATHS = ['/dashboards/relatorio-gastos-categoria'];

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [entidadesOpen, setEntidadesOpen] = useState(false);
  const [entidadesDropdownOpen, setEntidadesDropdownOpen] = useState(false);
  const [dashboardsOpen, setDashboardsOpen] = useState(false);
  const [dashboardsDropdownOpen, setDashboardsDropdownOpen] = useState(false);
  const entidadesRef = useRef<HTMLDivElement>(null);
  const dashboardsRef = useRef<HTMLDivElement>(null);

  const isEntidadesActive = ENTIDADES_PATHS.includes(location.pathname);
  const isDashboardsActive = DASHBOARDS_PATHS.includes(location.pathname);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (entidadesRef.current && !entidadesRef.current.contains(target)) setEntidadesDropdownOpen(false);
      if (dashboardsRef.current && !dashboardsRef.current.contains(target)) setDashboardsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      setEntidadesOpen(false);
      setDashboardsOpen(false);
    }
  }, [isMenuOpen]);

  const handleReload = () => {
    window.location.reload();
  };

  const linkBase = 'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 cursor-pointer';
  const linkActive = 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-sm';
  const linkInactive = 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-primary-500/30">
                <Logo className="w-5 h-5" classNamePath="stroke-white" />
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white hidden sm:block tracking-tight">
                {APP_NAME}
              </span>
            </Link>

            <nav className="hidden md:flex gap-1 items-center">
              <NavLink
                to="/"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              >
                <Home className="w-4 h-4" />
                Home
              </NavLink>

              <div className="relative" ref={entidadesRef}>
                <button
                  type="button"
                  onMouseEnter={() => setEntidadesDropdownOpen(true)}
                  onClick={() => setEntidadesDropdownOpen((v) => !v)}
                  className={`${linkBase} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800 ${entidadesDropdownOpen || isEntidadesActive ? linkActive : linkInactive}`}
                  aria-expanded={entidadesDropdownOpen}
                  aria-haspopup="true"
                >
                  <Database className="w-4 h-4" />
                  Entidades
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${entidadesDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {entidadesDropdownOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 py-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                    onMouseLeave={() => setEntidadesDropdownOpen(false)}
                  >
                    <Link
                      to="/categorias"
                      onClick={() => setEntidadesDropdownOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors duration-200 ${
                        location.pathname === '/categorias'
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <FolderTree className="w-4 h-4" />
                      Categorias
                    </Link>
                    <Link
                      to="/envelopes"
                      onClick={() => setEntidadesDropdownOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors duration-200 ${
                        location.pathname === '/envelopes'
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      Envelopes
                    </Link>
                    <Link
                      to="/tipos-envelope"
                      onClick={() => setEntidadesDropdownOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors duration-200 ${
                        location.pathname === '/tipos-envelope'
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      Tipos de Envelope
                    </Link>
                  </div>
                )}
              </div>

              <div className="relative" ref={dashboardsRef}>
                <button
                  type="button"
                  onMouseEnter={() => setDashboardsDropdownOpen(true)}
                  onClick={() => setDashboardsDropdownOpen((v) => !v)}
                  className={`${linkBase} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800 ${dashboardsDropdownOpen || isDashboardsActive ? linkActive : linkInactive}`}
                  aria-expanded={dashboardsDropdownOpen}
                  aria-haspopup="true"
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboards
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dashboardsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {dashboardsDropdownOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 py-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                    onMouseLeave={() => setDashboardsDropdownOpen(false)}
                  >
                    <Link
                      to="/dashboards/relatorio-gastos-categoria"
                      onClick={() => setDashboardsDropdownOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors duration-200 ${
                        location.pathname === '/dashboards/relatorio-gastos-categoria'
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      Relatório de Gastos por Categoria
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />

            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
              <img src={user?.avatar} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-primary-100 dark:border-primary-900" />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReload}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                title="Recarregar Aplicação"
                type="button"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={logout} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 cursor-pointer" title="Sair" type="button">
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <button className="md:hidden p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => setIsMenuOpen(!isMenuOpen)} type="button" aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/" className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 min-h-[44px] cursor-pointer transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>
              <Home className="w-5 h-5" /> Home
            </Link>

            <div>
              <button
                type="button"
                onClick={() => setEntidadesOpen((v) => !v)}
                className="flex items-center justify-between w-full gap-2 px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 min-h-[44px] cursor-pointer transition-colors duration-200"
              >
                <span className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Entidades
                </span>
                <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${entidadesOpen ? 'rotate-90' : ''}`} />
              </button>
              {entidadesOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 ml-3">
                  <Link to="/categorias" className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 min-h-[44px] cursor-pointer transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>
                    <FolderTree className="w-5 h-5" /> Categorias
                  </Link>
                  <Link to="/envelopes" className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 min-h-[44px] cursor-pointer transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>
                    <Wallet className="w-5 h-5" /> Envelopes
                  </Link>
                  <Link to="/tipos-envelope" className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 min-h-[44px] cursor-pointer transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>
                    <Layers className="w-5 h-5" /> Tipos de Envelope
                  </Link>
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setDashboardsOpen((v) => !v)}
                className="flex items-center justify-between w-full gap-2 px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 min-h-[44px] cursor-pointer transition-colors duration-200"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Dashboards
                </span>
                <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${dashboardsOpen ? 'rotate-90' : ''}`} />
              </button>
              {dashboardsOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 ml-3">
                  <Link to="/dashboards/relatorio-gastos-categoria" className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 min-h-[44px] cursor-pointer transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>
                    Relatório de Gastos por Categoria
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
