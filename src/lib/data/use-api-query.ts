"use client";

/**
 * Generic async data-fetching hook for API queries.
 * Replaces the Phase 1 useStoreQuery (which tracked localStorage store version).
 */

import { useEffect, useState } from "react";

/**
 * @param key - query identifier; must encode all query inputs. Changing key refetches.
 * @param query - async data fetcher (e.g. () => shopService.getProducts(f)).
 * @returns latest data, or null while loading the first time.
 */
export function useApiQuery<T>(key: string, query: () => Promise<T>): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let alive = true;
    query()
      .then((v) => {
        if (alive) setData(v);
      })
      .catch(() => {
        /* keep old data on error */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return data;
}

/** Backwards-compatible alias. */
export const useStoreQuery = useApiQuery;
