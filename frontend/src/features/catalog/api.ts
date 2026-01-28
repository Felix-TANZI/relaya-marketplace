import { http } from "@/services/api/http";
import type { Product, Category, ProductDetail } from "./types";

export function listProducts(): Promise<Product[]> {
  return http<Product[]>("/api/catalog/products/");
}

export function listCategories(): Promise<Category[]> {
  return http<Category[]>("/api/catalog/categories/");
}

export function getProduct(id: number): Promise<ProductDetail> {
  return http<ProductDetail>(`/api/catalog/products/${id}/`);
}
