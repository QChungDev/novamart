"use client";

/**
 * Helper cho component: fetch dữ liệu qua service async và tự fetch lại
 * mỗi khi store thay đổi (ví dụ Admin sửa sản phẩm → trang shop cập nhật).
 *
 * Phase 2: interface không đổi — query vẫn là () => Promise<T>, chỉ cần
 * trỏ service sang fetch() FastAPI.
 */

import { useEffect, useState } from "react";
import { useStoreVersion } from "./store";

/**
 * @param key - khóa định danh query; phải mã hóa mọi input của query
 *              (vd: JSON.stringify(filter)). Đổi key sẽ fetch lại.
 * @param query - hàm async lấy dữ liệu (vd: () => shopService.getProducts(f)).
 * @returns dữ liệu mới nhất, hoặc null khi đang tải lần đầu.
 */
export function useStoreQuery<T>(key: string, query: () => Promise<T>): T | null {
  const version = useStoreVersion();
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let alive = true;
    query()
      .then((v) => {
        if (alive) setData(v);
      })
      .catch(() => {
        /* giữ dữ liệu cũ khi lỗi */
      });
    return () => {
      alive = false;
    };
    // key mã hóa mọi input của query; version trigger khi store đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, key]);

  return data;
}
