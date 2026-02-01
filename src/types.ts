export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export interface EnvelopeTypeRecord {
  id: string;
  name: string;
  slug: string;
  relative_order: number;
}

export interface Envelope {
  id: string;
  user_id?: string;
  code: string;
  name: string;
  amount: number;
  envelope_type_id: string;
  envelope_type_name?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
  sub_categories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  category_id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'credit' | 'debit';

export interface Transaction {
  id: string;
  user_id?: string;
  date: string;
  type: TransactionType;
  description: string;
  amount: number;
  envelopeId: string | null;
  created_at?: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}