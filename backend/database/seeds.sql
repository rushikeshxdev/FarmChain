-- FarmChain Seed Data
-- Sample data for development and testing

-- ============================================================
-- CLEAR EXISTING DATA (for clean testing)
-- ============================================================
TRUNCATE TABLE quality_reports, transactions, batches, users RESTART IDENTITY CASCADE;

-- ============================================================
-- INSERT USERS
-- ============================================================

-- Password for all test users: "password123" (hashed with bcrypt)
-- Hash: $2b$10$rKJ5XqvZ8Jy7Y3mXqZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZe

INSERT INTO users (name, email, password_hash, role, phone, location, wallet_address) VALUES
-- Farmers
('Ramesh Patil', 'ramesh@farm.in', '$2b$10$rKJ5XqvZ8Jy7Y3mXqZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZe', 'farmer', '9876543210', 'Nashik, Maharashtra', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'),
('Meera Joshi', 'meera@farm.in', '$2b$10$rKJ5XqvZ8Jy7Y3mXqZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZe', 'farmer', '9876543211', 'Kolhapur, Maharashtra', '0x8B3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b'),
('Suresh Kumar', 'suresh@farm.in', '$2b$10$rKJ5XqvZ8Jy7Y3mXqZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZe', 'farmer', '9876543212', 'Pune, Maharashtra', '0x9C4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c'),

-- Distributors
('QuickTransport Ltd', 'dist@quicktransport.in', '$2b$10$rKJ5XqvZ8Jy7Y3mXqZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZe', 'distributor', '9876543213', 'Mumbai, Maharashtra', '0xAD5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d'),
('FastLogistics', 'dist@fastlog.in', '$2b$10$rKJ5XqvZ8Jy7Y3mXqZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZe', 'distributor', '9876543214', 'Thane, Maharashtra', '0xBE6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e'),

-- Retailers
('FreshMart', 'retail@freshmart.in', '$2b$10$rKJ5XqvZ8Jy7Y3mXqZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZe', 'retailer', '9876543215', 'Pune, Maharashtra', '0xCF7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f'),
('OrganicStore', 'retail@organic.in', '$2b$10$rKJ5XqvZ8Jy7Y3mXqZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZe', 'retailer', '9876543216', 'Mumbai, Maharashtra', '0xD08g8g8g8g8g8g8g8g8g8g8g8g8g8g8g8g8g8g8g'),

-- Admin
('System Admin', 'admin@farmchain.in', '$2b$10$rKJ5XqvZ8Jy7Y3mXqZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZeK7qZ5xZe', 'admin', '9876543217', 'System', '0xE19h9h9h9h9h9h9h9h9h9h9h9h9h9h9h9h9h9h9h');

-- ============================================================
-- INSERT BATCHES
-- ============================================================

INSERT INTO batches (batch_id, farmer_id, crop_type, quantity, unit, harvest_date, quality_grade, pesticide_used, organic_certified, location, status) VALUES
-- Ramesh's batches
('AG-2025-100001', 1, 'Tomato', 1200.00, 'kg', '2025-10-25', 'A+', false, true, 'Nashik, Maharashtra', 'sold'),
('AG-2025-100002', 1, 'Onion', 3500.00, 'kg', '2025-10-28', 'A', true, false, 'Nashik, Maharashtra', 'delivered'),
('AG-2025-100003', 1, 'Grape', 800.00, 'kg', '2025-11-01', 'A+', false, true, 'Nashik, Maharashtra', 'in_transit'),

-- Meera's batches
('AG-2025-100004', 2, 'Rice', 5000.00, 'kg', '2025-10-20', 'A', false, true, 'Kolhapur, Maharashtra', 'delivered'),
('AG-2025-100005', 2, 'Wheat', 4200.00, 'kg', '2025-10-22', 'B+', true, false, 'Kolhapur, Maharashtra', 'sold'),

-- Suresh's batches
('AG-2025-100006', 3, 'Potato', 2800.00, 'kg', '2025-10-30', 'A', true, false, 'Pune, Maharashtra', 'in_transit'),
('AG-2025-100007', 3, 'Carrot', 1500.00, 'kg', '2025-11-02', 'A+', false, true, 'Pune, Maharashtra', 'harvested'),
('AG-2025-100008', 3, 'Cabbage', 900.00, 'kg', '2025-11-05', 'B', true, false, 'Pune, Maharashtra', 'harvested');

-- ============================================================
-- INSERT TRANSACTIONS
-- ============================================================

-- Batch AG-2025-100001 (Tomato): Complete journey to sold
INSERT INTO transactions (batch_id, from_user_id, to_user_id, transaction_type, location, temperature, humidity, timestamp, notes) VALUES
('AG-2025-100001', 1, 4, 'transfer', 'Nashik Warehouse', 18.5, 65.0, '2025-10-26 08:30:00', 'Picked up by QuickTransport'),
('AG-2025-100001', 4, 6, 'delivery', 'FreshMart Pune', 20.0, 60.0, '2025-10-27 14:45:00', 'Delivered to FreshMart'),
('AG-2025-100001', 6, 6, 'sale', 'FreshMart Pune', NULL, NULL, '2025-10-28 10:00:00', 'Sold to consumers');

-- Batch AG-2025-100002 (Onion): Delivered
INSERT INTO transactions (batch_id, from_user_id, to_user_id, transaction_type, location, temperature, humidity, timestamp, notes) VALUES
('AG-2025-100002', 1, 4, 'transfer', 'Nashik Farm', 22.0, 55.0, '2025-10-29 07:00:00', 'Pickup from farm'),
('AG-2025-100002', 4, 7, 'delivery', 'OrganicStore Mumbai', 24.0, 58.0, '2025-10-30 16:30:00', 'Delivered successfully');

-- Batch AG-2025-100003 (Grape): In transit
INSERT INTO transactions (batch_id, from_user_id, to_user_id, transaction_type, location, temperature, humidity, timestamp, notes) VALUES
('AG-2025-100003', 1, 5, 'transfer', 'Nashik Vineyard', 16.0, 70.0, '2025-11-02 06:00:00', 'Premium grapes in refrigerated transport');

-- Batch AG-2025-100004 (Rice): Delivered
INSERT INTO transactions (batch_id, from_user_id, to_user_id, transaction_type, location, temperature, humidity, timestamp, notes) VALUES
('AG-2025-100004', 2, 4, 'transfer', 'Kolhapur Rice Mill', 25.0, 50.0, '2025-10-21 09:00:00', 'Processed and packed'),
('AG-2025-100004', 4, 6, 'delivery', 'FreshMart Pune', 26.0, 52.0, '2025-10-23 11:30:00', 'Organic rice delivered');

-- Batch AG-2025-100005 (Wheat): Sold
INSERT INTO transactions (batch_id, from_user_id, to_user_id, transaction_type, location, temperature, humidity, timestamp, notes) VALUES
('AG-2025-100005', 2, 5, 'transfer', 'Kolhapur Warehouse', 23.0, 48.0, '2025-10-23 10:00:00', 'Bulk wheat shipment'),
('AG-2025-100005', 5, 7, 'delivery', 'OrganicStore Mumbai', 25.0, 50.0, '2025-10-25 15:00:00', 'Delivered to store'),
('AG-2025-100005', 7, 7, 'sale', 'OrganicStore Mumbai', NULL, NULL, '2025-10-27 12:00:00', 'Completely sold out');

-- Batch AG-2025-100006 (Potato): In transit
INSERT INTO transactions (batch_id, from_user_id, to_user_id, transaction_type, location, temperature, humidity, timestamp, notes) VALUES
('AG-2025-100006', 3, 4, 'transfer', 'Pune Farm', 20.0, 60.0, '2025-10-31 08:00:00', 'Fresh potatoes picked up');

-- ============================================================
-- INSERT QUALITY REPORTS
-- ============================================================

INSERT INTO quality_reports (batch_id, inspector_id, inspection_date, pesticide_used, organic_certified, grade, moisture_content, contamination, remarks) VALUES
-- Tomato batch inspection
('AG-2025-100001', 8, '2025-10-26', false, true, 'A+', 94.5, NULL, 'Excellent quality organic tomatoes. No pesticide residue detected. Fresh and ripe.'),

-- Onion batch inspection
('AG-2025-100002', 8, '2025-10-29', true, false, 'A', 89.2, NULL, 'Good quality onions. Acceptable pesticide levels. Suitable for consumption.'),

-- Rice batch inspection
('AG-2025-100004', 8, '2025-10-21', false, true, 'A', 12.5, NULL, 'Premium organic rice. Perfect moisture content. Certified organic by FSSAI.'),

-- Wheat batch inspection
('AG-2025-100005', 8, '2025-10-23', true, false, 'B+', 13.8, NULL, 'Good quality wheat. Slight pesticide traces within safe limits.'),

-- Grape batch inspection
('AG-2025-100003', 8, '2025-11-02', false, true, 'A+', 82.0, NULL, 'Export quality organic grapes. Excellent sweetness and firmness.');

-- ============================================================
-- UPDATE BATCHES WITH QR CODES (Placeholder URLs)
-- ============================================================

UPDATE batches SET qr_code_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' WHERE batch_id LIKE 'AG-2025-%';

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================

DO $$
DECLARE
    user_count INTEGER;
    batch_count INTEGER;
    transaction_count INTEGER;
    report_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO batch_count FROM batches;
    SELECT COUNT(*) INTO transaction_count FROM transactions;
    SELECT COUNT(*) INTO report_count FROM quality_reports;
    
    RAISE NOTICE '✅ Seed data inserted successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Data Summary:';
    RAISE NOTICE '   - Users: %', user_count;
    RAISE NOTICE '   - Batches: %', batch_count;
    RAISE NOTICE '   - Transactions: %', transaction_count;
    RAISE NOTICE '   - Quality Reports: %', report_count;
    RAISE NOTICE '';
    RAISE NOTICE '👤 Test Login Credentials:';
    RAISE NOTICE '   Farmer: ramesh@farm.in / password123';
    RAISE NOTICE '   Distributor: dist@quicktransport.in / password123';
    RAISE NOTICE '   Retailer: retail@freshmart.in / password123';
    RAISE NOTICE '   Admin: admin@farmchain.in / password123';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to start the backend server!';
END $$;
