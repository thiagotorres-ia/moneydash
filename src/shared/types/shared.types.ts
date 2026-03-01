export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastContextType {
  addToast: (_message: string, _type?: ToastType) => void;
  removeToast: (_id: string) => void;
}
