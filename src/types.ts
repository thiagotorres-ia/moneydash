export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (_email: string, _pass: string) => Promise<void>;
  signup: (_email: string, _pass: string, _name: string) => Promise<void>;
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

/** Tipo da categoria: despesa ou receita. Subcategorias herdam o tipo da categoria mãe. */
export type CategoryType = 'despesa' | 'receita';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  /** Tipo da categoria. Ausente apenas em dados criados antes da migração 008; use 'despesa' como fallback. */
  type?: CategoryType;
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
  categoryId: string | null;
  subcategoryId: string | null;
  created_at?: string;
}

/** Uma linha do log de transferências entre envelopes (envelope_transfer_log). */
export interface EnvelopeTransferLogEntry {
  id: string;
  user_id: string;
  transfer_date: string;
  origin_envelope_id: string;
  origin_category_id: string | null;
  origin_subcategory_id: string | null;
  dest_envelope_id: string;
  dest_category_id: string | null;
  dest_subcategory_id: string | null;
  amount: number;
  created_at: string;
}

/** Payload para transferência entre envelopes (sem criar lançamentos). */
export interface EnvelopeTransferPayload {
  transferDate: string; // YYYY-MM-DD
  originEnvelopeId: string;
  originCategoryId: string | null;
  originSubcategoryId: string | null;
  destEnvelopeId: string;
  destCategoryId: string | null;
  destSubcategoryId: string | null;
  amount: number;
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