-- ============================================================================
-- QUIKOOO Hyperlocal Commerce Platform - Migration 001_init.sql
-- Database: PostgreSQL 14+ with PostGIS
-- Monetary Fields: NUMERIC(12, 2)
-- Identifiers: UUID v4
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Enable PostGIS if available on server
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "postgis";
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'PostGIS extension could not be loaded; falling back to numeric lat/lng columns.';
END $$;

-- 1. SYSTEM CONFIGURATION TABLE & SEED DEFAULTS
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed Phase 1 Official Model Defaults
INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('RESTAURANT_MENU_ADJUSTMENT_PERCENT', '5', 'Restaurant item markup percent added to original price'),
  ('RESTAURANT_PLATFORM_COMMISSION_PERCENT', '10', 'Platform commission percent charged on original price only'),
  ('CUSTOMER_PLATFORM_FEE', '5.00', 'Fixed platform fee charged to customer per order in INR'),
  ('CUSTOMER_DELIVERY_FEE', '25.00', 'Fixed delivery fee charged to customer per order in INR'),
  ('DELIVERY_PARTNER_PAYOUT', '25.00', 'Delivery payout to delivery partner in INR'),
  ('AGENT_SHARE_PERCENT', '60', 'Local Zone Agent share percentage of net commission/revenue pool'),
  ('QUIKOOO_SHARE_PERCENT', '40', 'QUIKOOO Platform share percentage of net commission/revenue pool'),
  ('DEFAULT_RADIUS_KM', '2', 'Default hyper-local discovery radius in kilometers'),
  ('RURAL_CUTOFF', '21:00', 'Daily order cutoff time (Asia/Kolkata) for rural next-day batch'),
  ('RURAL_DELIVERY_WINDOW_START', '05:00', 'Rural batch morning delivery window start time'),
  ('RURAL_DELIVERY_WINDOW_END', '08:00', 'Rural batch morning delivery window end time'),
  ('TAX_RATE', '0.18', 'Applicable GST/Tax rate on platform gross revenue')
ON CONFLICT (config_key) DO UPDATE 
SET config_value = EXCLUDED.config_value, updated_at = CURRENT_TIMESTAMP;

-- 2. USERS (Core Authentication & Identity)
CREATE TYPE user_role_enum AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'AGENT',
  'VENDOR',
  'DELIVERY_PARTNER',
  'CUSTOMER'
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'CUSTOMER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 3. ZONES (Operational Territories)
CREATE TYPE zone_type_enum AS ENUM ('URBAN', 'SUB_URBAN', 'RURAL');

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  zone_type zone_type_enum NOT NULL DEFAULT 'URBAN',
  center_latitude NUMERIC(10, 7) NOT NULL,
  center_longitude NUMERIC(10, 7) NOT NULL,
  radius_km NUMERIC(5, 2) NOT NULL DEFAULT 2.00,
  rural_cutoff_time VARCHAR(10) DEFAULT '21:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zones_code ON zones(code);
CREATE INDEX IF NOT EXISTS idx_zones_type ON zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_zones_is_active ON zones(is_active);

-- 4. AGENTS (Local Franchisees / Zone Managers)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  agent_code VARCHAR(50) UNIQUE NOT NULL,
  commission_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 60.00,
  bank_account_number VARCHAR(100),
  bank_ifsc VARCHAR(50),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_zone_id ON agents(zone_id);

-- 5. CUSTOMERS & ADDRESSES
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  referral_code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_zone_id ON customers(default_zone_id);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  landmark VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cust_addresses_cust_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_addresses_zone_id ON customer_addresses(zone_id);

-- 6. VENDORS & CATEGORIES & PRODUCTS
CREATE TABLE IF NOT EXISTS vendor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) NOT NULL DEFAULT 'RESTAURANT',
  phone VARCHAR(20) NOT NULL,
  address_text TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  menu_adjustment_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendors_zone_id ON vendors(zone_id);
CREATE INDEX IF NOT EXISTS idx_vendors_agent_id ON vendors(agent_id);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);

CREATE TABLE IF NOT EXISTS vendor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES vendor_categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  original_price NUMERIC(12, 2) NOT NULL,
  customer_menu_price NUMERIC(12, 2) NOT NULL, -- Computed: original_price + 5%
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor_id ON vendor_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_available ON vendor_products(is_available);

-- 7. DELIVERY PARTNERS
CREATE TABLE IF NOT EXISTS delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  vehicle_type VARCHAR(50),
  vehicle_number VARCHAR(50),
  payout_per_delivery NUMERIC(12, 2) NOT NULL DEFAULT 25.00,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_partners_zone_id ON delivery_partners(zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_partners_is_online ON delivery_partners(is_online);

-- 8. ORDERS & ORDER ITEMS & ORDER STATUS HISTORY
CREATE TYPE order_status_enum AS ENUM (
  'ORDER_PLACED',
  'PAYMENT_CONFIRMED',
  'VENDOR_ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'DELIVERY_ASSIGNED',
  'DELIVERY_ACCEPTED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'SCHEDULED_FOR_NEXT_DAY',
  'READY_FOR_MORNING_DISPATCH',
  'CANCELLED',
  'REFUND_INITIATED',
  'REFUNDED'
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  address_id UUID REFERENCES customer_addresses(id) ON DELETE RESTRICT,
  delivery_partner_id UUID REFERENCES delivery_partners(id) ON DELETE SET NULL,
  
  status order_status_enum NOT NULL DEFAULT 'ORDER_PLACED',
  zone_type zone_type_enum NOT NULL DEFAULT 'URBAN',
  
  -- Immutable Pricing & Commission Snapshot at Order Creation
  original_food_total NUMERIC(12, 2) NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,                 -- customer menu price total (original + 5%)
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 5.00,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 25.00,
  delivery_partner_payout NUMERIC(12, 2) NOT NULL DEFAULT 25.00,
  total_amount NUMERIC(12, 2) NOT NULL,             -- subtotal + 5 + 25
  
  menu_adjustment_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  menu_adjustment_amount NUMERIC(12, 2) NOT NULL,
  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  commission_amount NUMERIC(12, 2) NOT NULL,        -- 10% of original_food_total ONLY
  vendor_payout NUMERIC(12, 2) NOT NULL,            -- original_food_total - commission_amount
  quikooo_gross_revenue NUMERIC(12, 2) NOT NULL,    -- menu_adjustment_amount + commission_amount
  
  tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1800,
  tax_amount NUMERIC(12, 2) NOT NULL,
  agent_commission_share NUMERIC(12, 2) NOT NULL,   -- 60% of net revenue pool
  quikooo_revenue_share NUMERIC(12, 2) NOT NULL,    -- 40% of net revenue pool
  
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_zone_id ON orders(zone_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES vendor_products(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  original_unit_price NUMERIC(12, 2) NOT NULL,
  customer_menu_price NUMERIC(12, 2) NOT NULL,
  total_original_price NUMERIC(12, 2) NOT NULL,
  total_customer_price NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status_enum,
  to_status order_status_enum NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- 9. PAYMENTS & REFUNDS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_gateway_ref VARCHAR(255),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(50),
  gateway_response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
  gateway_refund_ref VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);

-- 10. DELIVERY ASSIGNMENTS & TRACKING
CREATE TABLE IF NOT EXISTS delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_partner_id UUID NOT NULL REFERENCES delivery_partners(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'OFFERED',
  payout_amount NUMERIC(12, 2) NOT NULL DEFAULT 25.00,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_del_assign_order ON delivery_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_del_assign_partner ON delivery_assignments(delivery_partner_id);

CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_assignment_id UUID NOT NULL REFERENCES delivery_assignments(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  speed NUMERIC(5, 2),
  bearing NUMERIC(5, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_del_tracking_assign_id ON delivery_tracking(delivery_assignment_id);

-- 11. FINANCIAL LEDGER (Double-Entry Bookkeeping)
CREATE TABLE IF NOT EXISTS financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  account VARCHAR(100) NOT NULL,
  entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  amount NUMERIC(12, 2) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_order_id ON financial_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_zone_id ON financial_ledger(zone_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_account ON financial_ledger(account);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_created_at ON financial_ledger(created_at);

-- 12. SETTLEMENTS (Vendor / Agent / Delivery Partner)
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_type VARCHAR(50) NOT NULL CHECK (settlement_type IN ('VENDOR', 'AGENT', 'DELIVERY_PARTNER')),
  recipient_id UUID NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  gross_amount NUMERIC(12, 2) NOT NULL,
  deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_payout NUMERIC(12, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  transaction_ref VARCHAR(255),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlements_recipient ON settlements(recipient_id);
CREATE INDEX IF NOT EXISTS idx_settlements_zone ON settlements(zone_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);

-- 13. SUPPORT TICKETS, NOTIFICATIONS & AUDIT LOGS
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'IN_APP',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100),
  changes JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
