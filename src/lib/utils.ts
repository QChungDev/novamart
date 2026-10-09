import { clsx, type ClassValue } from "clsx";

/** Merge Tailwind class names conditionally. */
export function cn(...inputs: ClassValue[]) {
  return clsx(...inputs);
}
