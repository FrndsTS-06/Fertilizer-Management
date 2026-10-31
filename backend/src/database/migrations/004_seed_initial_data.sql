-- ============================================================================
-- MIGRATION: 004_seed_initial_data.sql
-- PROJECT: Fertilizer Shop Management System
-- TARGET: PostgreSQL 18.6 | Database: fertilizer_management
-- DESCRIPTION: Initial seed dataset providing standard fertilizer categories,
--              verified manufacturers/suppliers, initial store configuration,
--              default admin credentials, and catalog baseline.
--
-- NOTE ON GSTIN & STORE SETTINGS:
-- GSTIN is seeded as NULL to avoid inserting fabricated legal registration numbers.
-- Store operators configure their legal GSTIN and shop name via store settings.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SEED STORE SETTINGS (Configurable baseline, GSTIN left unconfigured)
-- ----------------------------------------------------------------------------
INSERT INTO store_settings (
    id, 
    store_name, 
    legal_name, 
    gstin, 
    phone, 
    email, 
    address_line1, 
    village_or_city, 
    state, 
    pincode, 
    default_gst_rate, 
    default_gst_mode
) VALUES (
    1,
    'Fertilizer & Seed Store',
    'Retail Agricultural Inputs Agency',
    NULL, -- Left NULL for actual store owner configuration
    '9822012345',
    'info@fertilizershop.local',
    'Shop No. 12, Krishi Mandi Commercial Complex',
    'Agricultural Hub',
    'Maharashtra',
    '411001',
    5.00,
    'EXCLUSIVE'
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. SEED FERTILIZER CATEGORIES
-- Standard Indian fertilizer classifications.
-- ----------------------------------------------------------------------------
INSERT INTO categories (name, description) VALUES
    ('Nitrogenous', 'Primary nitrogen providers including Neem Coated Urea and Ammonium Sulphate for vegetative growth.'),
    ('Phosphatic', 'Phosphorus fertilizers including DAP and Single Super Phosphate (SSP) for root and tiller development.'),
    ('Potassic', 'Potash sources including MOP (Muriate of Potash) and SOP for grain quality and drought resistance.'),
    ('Complex', 'NPK blended complex fertilizers with balanced macro-nutrients (e.g. 19:19:19, 10:26:26, 12:32:16).'),
    ('Micronutrients', 'Essential secondary trace elements including Zinc Sulphate, Boron, Ferrous, and Magnesium.'),
    ('Bio-Fertilizers', 'Consortium of nitrogen-fixing, phosphate-solubilizing, and potash-mobilizing bacterial inoculants.'),
    ('Organic Fertilizers', 'Neem cake powder, vermicompost, city compost, and organic soil conditioners.')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. SEED SUPPLIERS / MANUFACTURERS
-- Established Indian fertilizer cooperative and corporate distributors.
-- ----------------------------------------------------------------------------
INSERT INTO suppliers (name, contact_person, phone, email, address, is_active) VALUES
    ('IFFCO', 'Regional Marketing Officer', '18001031967', 'contact@iffco.in', 'IFFCO Sadan, C-1, District Centre, Saket, New Delhi', TRUE),
    ('KRIBHCO', 'Area Sales Manager', '01202534631', 'info@kribhco.net', 'KRIBHCO Bhawan, A-10, Sector 1, Noida', TRUE),
    ('Coromandel International', 'Fertilizer Distribution Desk', '04027842034', 'reachus@coromandel.murugappa.com', 'Coromandel House, Sardar Patel Road, Secunderabad', TRUE),
    ('Mahadhan (Deepak Fertilisers)', 'Sales Executive', '02066458000', 'info@dfpcl.com', 'Sai Hira, Survey No 93, Mundhwa, Pune', TRUE),
    ('Multiplex Group', 'Agronomy Support', '08023344778', 'multiplex@multiplexgroup.com', 'Multiplex House, 1st Cross, Sampige Road, Malleshwaram, Bangalore', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. SEED INITIAL USERS (Admin & Cashier accounts)
-- Default bcrypt hash for initial password: 'Password@123'
-- ($2a$10$wT6d0O2oWqUv8XqPqDqWc.3nQv8sE6/aBvT6y8u4c3n9p2sE6aBvT)
-- ----------------------------------------------------------------------------
INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES
    ('admin@fertilizershop.local', '$2a$10$wT6d0O2oWqUv8XqPqDqWc.3nQv8sE6/aBvT6y8u4c3n9p2sE6aBvT', 'Store Administrator', 'ADMIN', TRUE),
    ('cashier@fertilizershop.local', '$2a$10$wT6d0O2oWqUv8XqPqDqWc.3nQv8sE6/aBvT6y8u4c3n9p2sE6aBvT', 'Billing Operator', 'STAFF', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. SEED INITIAL PRODUCTS (Matching frontend catalog baseline)
-- ----------------------------------------------------------------------------
INSERT INTO products (code, name, category_id, brand, package_type, package_size, unit, cost_price, price, stock, min_threshold, description) VALUES
    (
        'PRD001',
        'Neem Coated Urea (45kg)',
        (SELECT id FROM categories WHERE name = 'Nitrogenous'),
        'IFFCO',
        'Bags',
        '45kgs',
        'Bags (45kgs)',
        242.00,
        266.50,
        120.000,
        20.000,
        'Agricultural grade Neem Coated Urea containing 46% Nitrogen for soil application.'
    ),
    (
        'PRD002',
        'DAP - Di-Ammonium Phosphate (50kg)',
        (SELECT id FROM categories WHERE name = 'Phosphatic'),
        'IFFCO',
        'Bags',
        '50kgs',
        'Bags (50kgs)',
        1250.00,
        1350.00,
        45.000,
        15.000,
        'High phosphorus fertilizer (18:46:0) essential for root development and crop establishment.'
    ),
    (
        'PRD003',
        'MOP - Muriate of Potash (50kg)',
        (SELECT id FROM categories WHERE name = 'Potassic'),
        'KRIBHCO',
        'Bags',
        '50kgs',
        'Bags (50kgs)',
        1580.00,
        1700.00,
        8.000,
        15.000,
        'Potash source (60% K2O) providing disease resistance and quality grain development.'
    ),
    (
        'PRD004',
        'NPK 19:19:19 Water Soluble (1kg)',
        (SELECT id FROM categories WHERE name = 'Complex'),
        'Mahadhan',
        'Packets',
        '1kg',
        'Packets (1kg)',
        125.00,
        160.00,
        0.000,
        10.000,
        '100% water soluble balanced fertilizer for foliar spray and fertigation.'
    ),
    (
        'PRD005',
        'Zinc Sulphate Monohydrate 33% (5kg)',
        (SELECT id FROM categories WHERE name = 'Micronutrients'),
        'Multiplex',
        'Packets',
        '5kg',
        'Packets (5kg)',
        410.00,
        490.00,
        35.000,
        10.000,
        'Essential micronutrient for preventing zinc deficiency and chlorosis in crops.'
    ),
    (
        'PRD006',
        'Single Super Phosphate - SSP (50kg)',
        (SELECT id FROM categories WHERE name = 'Phosphatic'),
        'Coromandel',
        'Bags',
        '50kgs',
        'Bags (50kgs)',
        420.00,
        480.00,
        5.000,
        12.000,
        'Contains 16% water soluble P2O5 and 11% Sulphur, ideal for oilseeds and pulses.'
    ),
    (
        'PRD007',
        'Bio-NPK Liquid Biofertilizer (1L)',
        (SELECT id FROM categories WHERE name = 'Bio-Fertilizers'),
        'IFFCO',
        'Bottles',
        '1L',
        'Bottles (1L)',
        180.00,
        230.00,
        60.000,
        15.000,
        'Consortium of nitrogen-fixing, phosphate-solubilizing and potash-mobilizing bacteria.'
    ),
    (
        'PRD008',
        'Ammonium Sulphate (50kg)',
        (SELECT id FROM categories WHERE name = 'Nitrogenous'),
        'GSFC',
        'Bags',
        '50kgs',
        'Bags (50kgs)',
        850.00,
        960.00,
        24.000,
        10.000,
        'Provides 20.6% ammoniacal nitrogen and 24% sulphur for paddy, tea and sugarcane.'
    )
ON CONFLICT (code) DO NOTHING;

-- Log initial opening stock movements for seeded inventory
INSERT INTO stock_movements (
    product_id, product_code, product_name, movement_type, action_type, change_qty, previous_stock, new_stock, unit, reason, reference_no
)
SELECT 
    p.id, p.code, p.name, 'OPENING_STOCK', 'ADDED', p.stock, 0.000, p.stock, p.unit, 'Initial opening stock inward setup', 'INIT-STOCK-2026'
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM stock_movements sm WHERE sm.product_id = p.id AND sm.reference_no = 'INIT-STOCK-2026'
);

-- ----------------------------------------------------------------------------
-- 6. SEED INITIAL CUSTOMERS (Matching frontend farmer Khata baseline)
-- ----------------------------------------------------------------------------
INSERT INTO customers (customer_code, name, phone, village, address, credit_limit, opening_balance) VALUES
    ('CUST001', 'Ramesh Patel', '9822012345', 'Shivaji Nagar', 'Plot 12, Near Temple, Shivaji Nagar', 50000.00, 0.00),
    ('CUST002', 'Santosh Kumar', '9833012346', 'Kisanpur', 'House 45, Main Road, Kisanpur', 40000.00, 0.00),
    ('CUST003', 'Anil Deshmukh', '9844012347', 'Green Valley', 'Sector 3, Green Valley Farm', 60000.00, 0.00),
    ('CUST004', 'Rajendra Verma', '9855012348', 'Shivaji Nagar', 'Near Water Tank, Shivaji Nagar', 25000.00, 0.00),
    ('CUST005', 'Mahesh Jadhav', '9866012349', 'Wadgaon', 'Wadgaon East Agricultural Zone', 45000.00, 0.00)
ON CONFLICT (customer_code) DO NOTHING;

COMMIT;
