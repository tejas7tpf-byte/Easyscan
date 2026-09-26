import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = () => {
  return !!supabase;
};

/**
 * Universal Parallel Pagination Loader for Supabase Queries
 * Fetches all rows across table pagination chunks of 1000 in parallel.
 */
export const fetchAllRows = async (buildQueryFn) => {
  let allRows = [];
  let from = 0;
  const pageSize = 1000;
  let keepFetching = true;

  // Step 1: Initial query (0 to 999)
  const { data: firstChunk, error: firstErr } = await buildQueryFn().range(0, pageSize - 1);
  if (firstErr) throw firstErr;
  if (!firstChunk || firstChunk.length === 0) return [];
  allRows.push(...firstChunk);

  if (firstChunk.length < pageSize) {
    return allRows;
  }

  // Step 2: Parallel fetch remaining pages in blocks of 5 (5000 rows per round)
  let currentOffset = pageSize;
  while (keepFetching) {
    const batchPromises = [0, 1, 2, 3, 4].map(idx => {
      const start = currentOffset + idx * pageSize;
      const end = start + pageSize - 1;
      return buildQueryFn().range(start, end).then(res => {
        if (res.error) return [];
        return res.data || [];
      }).catch(() => []);
    });

    const batchResults = await Promise.all(batchPromises);
    let gotData = false;
    for (const chunk of batchResults) {
      if (chunk && chunk.length > 0) {
        allRows.push(...chunk);
        gotData = true;
        if (chunk.length < pageSize) {
          keepFetching = false;
          break;
        }
      } else {
        keepFetching = false;
        break;
      }
    }
    if (!gotData) keepFetching = false;
    currentOffset += 5 * pageSize;
  }

  return allRows;
};

/**
 * Check if a receive_date value represents a received part
 */
export const isReceiveDateCompleted = (val) => {
  if (!val) return false;
  const str = val.toString().trim().toUpperCase();
  if (!str || str === '-' || str.startsWith('DD-MM') || str === 'NULL') return false;
  if (str === 'ADV' || str.includes('ADV')) return false;
  return true;
};
