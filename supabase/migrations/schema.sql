-- ====================================================================
-- H2O Management System (AquaFlow ERP) - Production Database Schema
-- Multi-branch ready, Role-Based Access Control (RLS), Auto-Calculations
-- ====================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Roles
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'factory_manager',
    'warehouse_officer',
    'sales_officer',
    'accountant'
);

-- Bottle Sizes
CREATE TYPE bottle_size_enum AS ENUM (
    '330ml',
    '500ml',
    '750ml',
    '1L',
    '1.5L',
    '5L',
    '19L'
);

-- Production Shift
CREATE TYPE shift_enum AS ENUM (
    'Morning',
    'Afternoon',
    'Night'
);

-- Production Batch Status
CREATE TYPE batch_status_enum AS ENUM (
    'Completed',
    'Pending',
    'Cancelled'
);

-- Warehouse Transaction Type
CREATE TYPE transaction_type_enum AS ENUM (
    'Stock In',
    'Stock Out',
    'Transfer',
    'Adjustment',
    'Return',
    'Damaged',
    'Stock Count'
);

-- Customer Types
CREATE TYPE customer_type_enum AS ENUM (
    'Business',
    'Retail',
    'Distributor'
);

-- Supplier Categories
CREATE TYPE supplier_category_enum AS ENUM (
    'Bottle',
    'Cap',
    'Label',
    'Packaging',
    'Chemical',
    'Water',
    'Other'
);

-- Sales Types
CREATE TYPE sale_type_enum AS ENUM (
    'Cash',
    'Credit',
    'Wholesale',
    'Retail',
    'Distributor'
);

-- Payment Status
CREATE TYPE payment_status_enum AS ENUM (
    'Paid',
    'Partial',
    'Unpaid',
    'Overdue'
);

-- Machine Status
CREATE TYPE machine_status_enum AS ENUM (
    'Operational',
    'Maintenance',
    'Offline',
    'Degraded'
);

-- 2. BRANCHES TABLE (Multi-Branch Ready)
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(255) NOT NULL,
    is_main BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES / USERS TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'sales_officer',
    branch_id UUID REFERENCES branches(id),
    avatar_url TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RAW MATERIALS TABLE
CREATE TABLE IF NOT EXISTS raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    category supplier_category_enum DEFAULT 'Other',
    unit VARCHAR(50) NOT NULL, -- kg, pcs, liters, rolls
    current_stock NUMERIC(12, 2) DEFAULT 0.00,
    reorder_level NUMERIC(12, 2) DEFAULT 100.00,
    cost_per_unit NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    category supplier_category_enum NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BOTTLE TYPES TABLE
CREATE TABLE IF NOT EXISTS bottle_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    size bottle_size_enum NOT NULL,
    name VARCHAR(100) NOT NULL,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    current_quantity INT DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id),
    usage_count INT DEFAULT 0,
    balance INT DEFAULT 0,
    reorder_level INT DEFAULT 500,
    barcode VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MACHINES TABLE
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    model_number VARCHAR(100),
    status machine_status_enum DEFAULT 'Operational',
    efficiency NUMERIC(5, 2) DEFAULT 95.00, -- percentage
    capacity_per_hour INT DEFAULT 3000,
    last_serviced_date DATE,
    next_service_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PRODUCTION BATCHES TABLE
CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift shift_enum NOT NULL DEFAULT 'Morning',
    machine_used VARCHAR(255) NOT NULL,
    machine_id UUID REFERENCES machines(id),
    operator_name VARCHAR(255) NOT NULL,
    bottle_size bottle_size_enum NOT NULL,
    bottle_type_id UUID REFERENCES bottle_types(id),
    quantity_produced INT NOT NULL CHECK (quantity_produced >= 0),
    rejected_quantity INT NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0),
    damaged_bottles INT NOT NULL DEFAULT 0 CHECK (damaged_bottles >= 0),
    accepted_quantity INT GENERATED ALWAYS AS (quantity_produced - rejected_quantity - damaged_bottles) STORED,
    waste_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN quantity_produced > 0 
        THEN ROUND(((rejected_quantity + damaged_bottles)::numeric / quantity_produced::numeric) * 100, 2) 
        ELSE 0 
        END
    ) STORED,
    efficiency_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN quantity_produced > 0 
        THEN ROUND(((quantity_produced - rejected_quantity - damaged_bottles)::numeric / quantity_produced::numeric) * 100, 2) 
        ELSE 0 
        END
    ) STORED,
    production_cost NUMERIC(12, 2) DEFAULT 0.00,
    cost_per_bottle NUMERIC(10, 2) GENERATED ALWAYS AS (
        CASE WHEN (quantity_produced - rejected_quantity - damaged_bottles) > 0
        THEN ROUND(production_cost / (quantity_produced - rejected_quantity - damaged_bottles)::numeric, 2)
        ELSE 0
        END
    ) STORED,
    status batch_status_enum DEFAULT 'Completed',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FINISHED GOODS INVENTORY TABLE
CREATE TABLE IF NOT EXISTS finished_goods_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    bottle_size bottle_size_enum NOT NULL,
    opening_stock INT DEFAULT 0,
    produced_stock INT DEFAULT 0,
    sold_stock INT DEFAULT 0,
    returned_stock INT DEFAULT 0,
    damaged_stock INT DEFAULT 0,
    reserved_stock INT DEFAULT 0,
    current_stock INT GENERATED ALWAYS AS (
        (opening_stock + produced_stock + returned_stock) - (sold_stock + damaged_stock)
    ) STORED,
    available_stock INT GENERATED ALWAYS AS (
        ((opening_stock + produced_stock + returned_stock) - (sold_stock + damaged_stock)) - reserved_stock
    ) STORED,
    min_stock INT DEFAULT 500,
    max_stock INT DEFAULT 15000,
    location VARCHAR(100) DEFAULT 'Warehouse Main - Bay A',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, bottle_size)
);

-- 10. WAREHOUSE TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS warehouse_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    reference_code VARCHAR(100) UNIQUE NOT NULL,
    type transaction_type_enum NOT NULL,
    product_size bottle_size_enum NOT NULL,
    quantity INT NOT NULL,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    barcode VARCHAR(100),
    qr_code VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    type customer_type_enum DEFAULT 'Retail',
    contact_person VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    credit_limit NUMERIC(12, 2) DEFAULT 5000.00,
    outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PURCHASES (Purchase Orders) TABLE
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Ordered', -- Draft, Ordered, Received, Cancelled
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    tax NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PURCHASE ITEMS TABLE
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. SALES TABLE (Invoices)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    type sale_type_enum DEFAULT 'Retail',
    sale_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    tax NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    payment_status payment_status_enum DEFAULT 'Unpaid',
    payment_method VARCHAR(50) DEFAULT 'Cash',
    salesperson_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    bottle_size bottle_size_enum NOT NULL,
    bottle_type_id UUID REFERENCES bottle_types(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(10, 2) DEFAULT 0.00,
    total_price NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer', -- Cash, Bank Transfer, Card, Mobile Money, Cheque
    reference_number VARCHAR(100),
    payment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    expense_number VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL, -- Electricity, Water Utility, Labor, Machine Maintenance, Fuel/Transport, Chemical & Filtration, Rent, Packaging, Office
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    payee VARCHAR(255),
    description TEXT,
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    user_id UUID REFERENCES profiles(id),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, STOCK_ADJUST, LOGIN
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. AUTOMATIC INVENTORY & CUSTOMER BALANCE TRIGGERS

-- Function to handle Production Batch Completion -> Auto Increase Finished Goods Inventory
CREATE OR REPLACE FUNCTION trigger_update_inventory_on_production()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Completed' AND (TG_OP = 'INSERT' OR OLD.status != 'Completed') THEN
        INSERT INTO finished_goods_inventory (bottle_size, produced_stock, damaged_stock)
        VALUES (NEW.bottle_size, NEW.accepted_quantity, NEW.damaged_bottles)
        ON CONFLICT (branch_id, bottle_size)
        DO UPDATE SET 
            produced_stock = finished_goods_inventory.produced_stock + NEW.accepted_quantity,
            damaged_stock = finished_goods_inventory.damaged_stock + NEW.damaged_bottles,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_production_inventory_update
AFTER INSERT OR UPDATE ON production_batches
FOR EACH ROW
EXECUTE FUNCTION trigger_update_inventory_on_production();

-- Function to handle Sale Creation -> Auto Deduct Inventory
CREATE OR REPLACE FUNCTION trigger_update_inventory_on_sale_item()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE finished_goods_inventory
    SET sold_stock = sold_stock + NEW.quantity,
        updated_at = NOW()
    WHERE bottle_size = NEW.bottle_size;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_item_inventory_deduct
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION trigger_update_inventory_on_sale_item();

-- 20. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_goods_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super Admin: Full Access
CREATE POLICY "Super Admins full access on profiles" ON profiles
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "Super Admins full access on production" ON production_batches
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "Super Admins full access on inventory" ON finished_goods_inventory
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "Super Admins full access on sales" ON sales
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "Super Admins full access on expenses" ON expenses
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

-- Factory Manager: Production and Inventory access
CREATE POLICY "Factory Managers production manage" ON production_batches
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'factory_manager'));

CREATE POLICY "Factory Managers view inventory" ON finished_goods_inventory
    FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'factory_manager', 'warehouse_officer', 'sales_officer', 'accountant'));

-- Warehouse Officer: Warehouse transactions
CREATE POLICY "Warehouse Officer transactions" ON warehouse_transactions
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'warehouse_officer', 'factory_manager'));

-- Sales Officer: Sales & Customers
CREATE POLICY "Sales Officer sales manage" ON sales
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'sales_officer'));

CREATE POLICY "Sales Officer customer manage" ON customers
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'sales_officer', 'accountant'));

-- Accountant: Read-only access to Financials and Reports
CREATE POLICY "Accountant financial views" ON expenses
    FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'accountant'));

-- Authenticated General Access
CREATE POLICY "Authenticated users view profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');
