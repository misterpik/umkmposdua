import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper types for better TypeScript support
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Type aliases for common tables
export type User = Tables<"users">;
export type Product = Tables<"products">;
export type Category = Tables<"categories">;
export type Warehouse = Tables<"warehouses">;
export type Inventory = Tables<"inventory">;
export type Transaction = Tables<"transactions">;
export type TransactionItem = Tables<"transaction_items">;
export type StockTransfer = Tables<"stock_transfers">;
export type StockTransferItem = Tables<"stock_transfer_items">;

// Extended types with relations
export interface ProductWithCategory extends Product {
  category: Category | null;
}

export interface ProductWithInventory extends ProductWithCategory {
  inventory: (Inventory & { warehouse: Warehouse })[];
}

export interface TransactionWithItems extends Transaction {
  transaction_items: (TransactionItem & { product: Product })[];
  user: User | null;
}

export interface StockTransferWithItems extends StockTransfer {
  stock_transfer_items: (StockTransferItem & { product: Product })[];
  from_warehouse: Warehouse | null;
  to_warehouse: Warehouse | null;
  user: User | null;
}
