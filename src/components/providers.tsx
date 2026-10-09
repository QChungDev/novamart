"use client";

import { AuthProvider } from "@/lib/store/auth-store";
import { CartProvider } from "@/lib/store/cart-store";
import { ToastProvider } from "@/lib/store/toast-store";

/** Global client providers: toast, mock auth, cart (localStorage). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
