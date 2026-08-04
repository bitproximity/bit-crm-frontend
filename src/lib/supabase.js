import { createClient } from '@supabase/supabase-js';

// Valores por defecto embebidos directamente: no son secretos (la URL y la
// key publishable de Supabase están diseñadas para ser públicas/visibles en
// el navegador), así que no dependemos de que la plataforma de hosting pase
// bien las variables de entorno del build.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://myyccgykrrhtwvbgishc.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_JVbrmiArNHAZq7we2qno9w_X5w_FA6E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
