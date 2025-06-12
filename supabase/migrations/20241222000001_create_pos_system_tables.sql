-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for authentication and role management
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'inventory')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create warehouses table
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory table for stock tracking
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  stock_level INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 10,
  max_stock INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id),
  customer_name TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'cash', 'mobile')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_items table
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_transfers table
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number TEXT UNIQUE NOT NULL,
  from_warehouse_id UUID REFERENCES public.warehouses(id),
  to_warehouse_id UUID REFERENCES public.warehouses(id),
  user_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_transfer_items table
CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse ON public.inventory(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_created_at ON public.stock_transfers(created_at);

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
  ('Electronics', 'Electronic devices and accessories'),
  ('Furniture', 'Office and home furniture'),
  ('Appliances', 'Home and kitchen appliances'),
  ('Clothing', 'Apparel and accessories'),
  ('Produce', 'Fresh fruits and vegetables'),
  ('Bakery', 'Bread and baked goods'),
  ('Dairy', 'Milk and dairy products'),
  ('Meat', 'Fresh meat and poultry'),
  ('Dry Goods', 'Non-perishable food items')
ON CONFLICT (name) DO NOTHING;

-- Insert default warehouses
INSERT INTO public.warehouses (name, location, address) VALUES
  ('Warehouse A', 'New York', '123 Main St, New York, NY 10001'),
  ('Warehouse B', 'Los Angeles', '456 Oak Ave, Los Angeles, CA 90001'),
  ('Warehouse C', 'Chicago', '789 Pine St, Chicago, IL 60601')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO public.products (name, sku, barcode, price, category_id, image_url) 
SELECT 
  'Laptop', 'TECH-001', '123456789001', 999.99, c.id, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&q=80'
FROM public.categories c WHERE c.name = 'Electronics'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (name, sku, barcode, price, category_id, image_url) 
SELECT 
  'Smartphone', 'TECH-002', '123456789002', 599.99, c.id, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80'
FROM public.categories c WHERE c.name = 'Electronics'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (name, sku, barcode, price, category_id, image_url) 
SELECT 
  'Headphones', 'TECH-003', '123456789003', 99.99, c.id, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80'
FROM public.categories c WHERE c.name = 'Electronics'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (name, sku, barcode, price, category_id, image_url) 
SELECT 
  'Desk Chair', 'FURN-001', '123456789004', 199.99, c.id, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&q=80'
FROM public.categories c WHERE c.name = 'Furniture'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (name, sku, barcode, price, category_id, image_url) 
SELECT 
  'Coffee Maker', 'APPL-001', '123456789005', 79.99, c.id, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&q=80'
FROM public.categories c WHERE c.name = 'Appliances'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (name, sku, barcode, price, category_id, image_url) 
SELECT 
  'Organic Apples', 'PROD-001', '123456789006', 2.99, c.id, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&q=80'
FROM public.categories c WHERE c.name = 'Produce'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (name, sku, barcode, price, category_id, image_url) 
SELECT 
  'Whole Grain Bread', 'BAKE-001', '123456789007', 3.49, c.id, 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=300&q=80'
FROM public.categories c WHERE c.name = 'Bakery'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (name, sku, barcode, price, category_id, image_url) 
SELECT 
  'Milk (1 Gallon)', 'DAIR-001', '123456789008', 4.29, c.id, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&q=80'
FROM public.categories c WHERE c.name = 'Dairy'
ON CONFLICT (sku) DO NOTHING;

-- Insert sample inventory data
INSERT INTO public.inventory (product_id, warehouse_id, stock_level, reorder_point)
SELECT p.id, w.id, 
  CASE 
    WHEN p.sku = 'TECH-001' THEN 15
    WHEN p.sku = 'TECH-002' THEN 8
    WHEN p.sku = 'TECH-003' THEN 3
    WHEN p.sku = 'FURN-001' THEN 0
    WHEN p.sku = 'APPL-001' THEN 12
    WHEN p.sku = 'PROD-001' THEN 50
    WHEN p.sku = 'BAKE-001' THEN 20
    WHEN p.sku = 'DAIR-001' THEN 30
    ELSE 10
  END as stock_level,
  CASE 
    WHEN p.sku = 'TECH-001' THEN 5
    WHEN p.sku = 'TECH-002' THEN 5
    WHEN p.sku = 'TECH-003' THEN 10
    WHEN p.sku = 'FURN-001' THEN 5
    WHEN p.sku = 'APPL-001' THEN 5
    WHEN p.sku = 'PROD-001' THEN 20
    WHEN p.sku = 'BAKE-001' THEN 10
    WHEN p.sku = 'DAIR-001' THEN 15
    ELSE 5
  END as reorder_point
FROM public.products p
CROSS JOIN public.warehouses w
WHERE w.name = 'Warehouse A'
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- Enable realtime for all tables
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.warehouses;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.inventory;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.transaction_items;
alter publication supabase_realtime add table public.stock_transfers;
alter publication supabase_realtime add table public.stock_transfer_items;
