-- FarmChain Database Schema
-- PostgreSQL Database Migration Script
-- Version: 1.0.0

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS quality_reports CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS batch_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS quality_grade CASCADE;

-- Create custom ENUM types
CREATE TYPE user_role AS ENUM ('farmer', 'distributor', 'retailer', 'inspector', 'manufacturer', 'admin');
CREATE TYPE batch_status AS ENUM ('harvested', 'in_transit', 'delivered', 'processed', 'sold', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('transfer', 'pickup', 'delivery', 'inspection', 'sale');
CREATE TYPE quality_grade AS ENUM ('A+', 'A', 'B+', 'B', 'C');

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR(15),
    location VARCHAR(200),
    wallet_address VARCHAR(42), -- Ethereum wallet address (0x + 40 chars)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- ============================================================
-- BATCHES TABLE
-- ============================================================
CREATE TABLE batches (
    batch_id VARCHAR(20) PRIMARY KEY, -- Format: AG-YYYY-XXXXXX
    farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    crop_type VARCHAR(100) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg', -- kg, ton, quintal, pieces
    harvest_date DATE NOT NULL,
    quality_grade quality_grade NOT NULL,
    pesticide_used BOOLEAN DEFAULT FALSE,
    organic_certified BOOLEAN DEFAULT FALSE,
    location VARCHAR(200),
    blockchain_hash VARCHAR(66), -- Ethereum transaction hash
    qr_code_url TEXT, -- Base64 encoded QR code or URL
    status batch_status DEFAULT 'harvested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for batches table
CREATE INDEX idx_batches_farmer ON batches(farmer_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_crop_type ON batches(crop_type);
CREATE INDEX idx_batches_harvest_date ON batches(harvest_date);
CREATE INDEX idx_batches_blockchain_hash ON batches(blockchain_hash);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    batch_id VARCHAR(20) NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
    from_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    to_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    location VARCHAR(200),
    temperature DECIMAL(5, 2), -- Temperature in Celsius
    humidity DECIMAL(5, 2), -- Humidity percentage
    blockchain_tx_hash VARCHAR(66), -- Ethereum transaction hash
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create indexes for transactions table
CREATE INDEX idx_transactions_batch ON transactions(batch_id);
CREATE INDEX idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_transactions_blockchain_hash ON transactions(blockchain_tx_hash);

-- ============================================================
-- QUALITY REPORTS TABLE
-- ============================================================
CREATE TABLE quality_reports (
    report_id SERIAL PRIMARY KEY,
    batch_id VARCHAR(20) NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
    inspector_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    inspection_date DATE NOT NULL,
    pesticide_used BOOLEAN DEFAULT FALSE,
    organic_certified BOOLEAN DEFAULT FALSE,
    grade quality_grade NOT NULL,
    moisture_content DECIMAL(5, 2), -- Moisture percentage
    contamination VARCHAR(500), -- Contamination details if any
    remarks TEXT,
    report_url TEXT, -- URL to uploaded report document
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for quality_reports table
CREATE INDEX idx_quality_reports_batch ON quality_reports(batch_id);
CREATE INDEX idx_quality_reports_inspector ON quality_reports(inspector_id);
CREATE INDEX idx_quality_reports_grade ON quality_reports(grade);
CREATE INDEX idx_quality_reports_inspection_date ON quality_reports(inspection_date);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for batches table
CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- View: Batch with farmer details
CREATE OR REPLACE VIEW batch_details_view AS
SELECT 
    b.batch_id,
    b.crop_type,
    b.quantity,
    b.unit,
    b.harvest_date,
    b.quality_grade,
    b.pesticide_used,
    b.organic_certified,
    b.location as batch_location,
    b.blockchain_hash,
    b.qr_code_url,
    b.status,
    b.created_at,
    u.user_id as farmer_id,
    u.name as farmer_name,
    u.email as farmer_email,
    u.phone as farmer_phone,
    u.location as farmer_location,
    u.wallet_address as farmer_wallet
FROM batches b
JOIN users u ON b.farmer_id = u.user_id;

-- View: Supply chain journey
CREATE OR REPLACE VIEW supply_chain_view AS
SELECT 
    t.transaction_id,
    t.batch_id,
    b.crop_type,
    b.quantity,
    t.transaction_type,
    t.location,
    t.temperature,
    t.humidity,
    t.timestamp,
    t.blockchain_tx_hash,
    from_user.name as from_user_name,
    from_user.role as from_user_role,
    to_user.name as to_user_name,
    to_user.role as to_user_role
FROM transactions t
JOIN batches b ON t.batch_id = b.batch_id
LEFT JOIN users from_user ON t.from_user_id = from_user.user_id
LEFT JOIN users to_user ON t.to_user_id = to_user.user_id
ORDER BY t.timestamp ASC;

-- ============================================================
-- GRANT PERMISSIONS (adjust username as needed)
-- ============================================================

-- Grant privileges to application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE users IS 'Stores all user accounts (farmers, distributors, retailers, admins)';
COMMENT ON TABLE batches IS 'Stores agricultural produce batches created by farmers';
COMMENT ON TABLE transactions IS 'Records all supply chain movements and transfers';
COMMENT ON TABLE quality_reports IS 'Quality inspection reports for batches';

COMMENT ON COLUMN batches.blockchain_hash IS 'Ethereum transaction hash from smart contract';
COMMENT ON COLUMN transactions.blockchain_tx_hash IS 'Ethereum transaction hash for ownership transfer';
COMMENT ON COLUMN users.wallet_address IS 'Ethereum wallet address for blockchain transactions';

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ FarmChain database schema created successfully!';
    RAISE NOTICE '📊 Tables created: users, batches, transactions, quality_reports';
    RAISE NOTICE '🔍 Views created: batch_details_view, supply_chain_view';
    RAISE NOTICE '⚡ Indexes and triggers configured';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run seed data: psql -d agri_supply_chain -f seeds.sql';
    RAISE NOTICE '2. Configure .env file with database credentials';
    RAISE NOTICE '3. Start the backend server: npm run dev';
END $$;
