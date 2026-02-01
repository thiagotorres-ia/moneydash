
import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LogOut, Menu, X, RefreshCw, LayoutDashboard, FolderTree, Layers } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';
import { Logo } from './Logo';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleReload = () => {
    window.location.reload();
  };

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
                className={({ isActive }) => `
                  px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                  ${isActive 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
              <NavLink
                to="/categorias"
                className={({ isActive }) => `
                  px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                  ${isActive 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <FolderTree className="w-4 h-4" />
                Categorias
              </NavLink>
              <NavLink
                to="/tipos-envelope"
                className={({ isActive }) => `
                  px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                  ${isActive 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <Layers className="w-4 h-4" />
                Tipos de Envelope
              </NavLink>
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
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
                title="Recarregar Aplicação"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={logout} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <button className="md:hidden p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700" onClick={() => setIsMenuOpen(false)}>
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </Link>
            <Link to="/categorias" className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700" onClick={() => setIsMenuOpen(false)}>
              <FolderTree className="w-5 h-5" /> Categorias
            </Link>
            <Link to="/tipos-envelope" className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700" onClick={() => setIsMenuOpen(false)}>
              <Layers className="w-5 h-5" /> Tipos de Envelope
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
