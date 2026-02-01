
import { supabase } from '../lib/supabase';
import { Category, Subcategory } from '../types';

export const categoryService = {
  /**
   * Retorna todas as categorias do usuário logado, incluindo subcategorias.
   */
  async getAll(): Promise<Category[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        sub_categories:subcategories(*)
      `)
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }

    return data as Category[];
  },

  /**
   * Alias para compatibilidade.
   */
  async getCategories(): Promise<Category[]> {
    return this.getAll();
  },

  /**
   * Retorna subcategorias de uma categoria específica.
   */
  async getSubcategories(categoryId: string): Promise<Subcategory[]> {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Subcategory[];
  },

  /**
   * Cria uma nova categoria e suas subcategorias.
   */
  async create(name: string, subcategoryNames: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 1. Criar a categoria principal
    const { data: category, error: catError } = await supabase
      .from('categories')
      .insert([{
        user_id: user.id,
        name: name.trim()
      }])
      .select()
      .single();

    if (catError) throw catError;

    // 2. Criar subcategorias se houver
    if (subcategoryNames && subcategoryNames.length > 0) {
      const subsPayload = subcategoryNames.map(subName => ({
        user_id: user.id,
        category_id: category.id,
        name: subName.trim()
      }));

      const { error: subError } = await supabase
        .from('subcategories')
        .insert(subsPayload);

      if (subError) throw subError;
    }
  },

  /**
   * Exclui uma categoria e dispara o CASCADE (se configurado no DB) ou limpa manualmente.
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Atualiza uma categoria e gerencia a sincronização de subcategorias.
   * Nota: Simplificado para lidar com substituição completa de subs por enquanto.
   */
  async update(id: string, name: string, subcategoryNames: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 1. Atualizar nome da categoria
    const { error: catError } = await supabase
      .from('categories')
      .update({ name: name.trim() })
      .eq('id', id);

    if (catError) throw catError;

    // 2. Lógica de Sincronização de Subcategorias:
    // Para simplificar e evitar lógica de diff complexa, limpamos as antigas e inserimos as novas.
    // ATENÇÃO: Em produção, isso pode quebrar vínculos de transações. 
    // O ideal seria um merge (upsert/delete).
    
    // Deletar existentes
    await supabase.from('subcategories').delete().eq('category_id', id);

    // Inserir novas
    if (subcategoryNames && subcategoryNames.length > 0) {
      const subsPayload = subcategoryNames.map(subName => ({
        user_id: user.id,
        category_id: id,
        name: subName.trim()
      }));

      const { error: subError } = await supabase
        .from('subcategories')
        .insert(subsPayload);

      if (subError) throw subError;
    }
  }
};
