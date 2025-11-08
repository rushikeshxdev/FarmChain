# FarmChain Database Documentation

## Overview

The FarmChain database uses PostgreSQL as the relational database management system. It implements a comprehensive schema to track the entire agricultural supply chain from farm to consumer.

## Database Architecture

### Tables

#### 1. **users**
Stores all user accounts with role-based access.

**Columns:**
- `user_id` (SERIAL PRIMARY KEY): Unique identifier
- `name` (VARCHAR): User's full name
- `email` (VARCHAR UNIQUE): Login email
- `password_hash` (VARCHAR): Bcrypt hashed password
- `role` (ENUM): farmer, distributor, retailer, admin
- `phone` (VARCHAR): Contact number
- `location` (VARCHAR): User's location
- `wallet_address` (VARCHAR): Ethereum wallet address
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- email, role, wallet_address

---

#### 2. **batches**
Stores agricultural produce batches created by farmers.

**Columns:**
- `batch_id` (VARCHAR PRIMARY KEY): Format AG-YYYY-XXXXXX
- `farmer_id` (INTEGER FK): References users
- `crop_type` (VARCHAR): Type of crop
- `quantity` (DECIMAL): Amount produced
- `unit` (VARCHAR): kg, ton, quintal, pieces
- `harvest_date` (DATE): Date of harvest
- `quality_grade` (ENUM): A+, A, B+, B, C
- `pesticide_used` (BOOLEAN)
- `organic_certified` (BOOLEAN)
- `location` (VARCHAR): Farm location
- `blockchain_hash` (VARCHAR): Ethereum TX hash
- `qr_code_url` (TEXT): Base64 encoded QR code
- `status` (ENUM): harvested, in_transit, delivered, processed, sold, cancelled
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- farmer_id, status, crop_type, harvest_date, blockchain_hash

---

#### 3. **transactions**
Records all supply chain movements and ownership transfers.

**Columns:**
- `transaction_id` (SERIAL PRIMARY KEY)
- `batch_id` (VARCHAR FK): References batches
- `from_user_id` (INTEGER FK): Sender
- `to_user_id` (INTEGER FK): Receiver
- `transaction_type` (ENUM): transfer, pickup, delivery, inspection, sale
- `location` (VARCHAR): Transaction location
- `temperature` (DECIMAL): Environmental condition
- `humidity` (DECIMAL): Environmental condition
- `blockchain_tx_hash` (VARCHAR): Ethereum TX hash
- `timestamp` (TIMESTAMP): Transaction time
- `notes` (TEXT): Additional information

**Indexes:**
- batch_id, from_user_id, to_user_id, transaction_type, timestamp

---

#### 4. **quality_reports**
Quality inspection reports for batches.

**Columns:**
- `report_id` (SERIAL PRIMARY KEY)
- `batch_id` (VARCHAR FK): References batches
- `inspector_id` (INTEGER FK): References users
- `inspection_date` (DATE)
- `pesticide_used` (BOOLEAN)
- `organic_certified` (BOOLEAN)
- `grade` (ENUM): A+, A, B+, B, C
- `moisture_content` (DECIMAL): Percentage
- `contamination` (VARCHAR): Details if any
- `remarks` (TEXT)
- `report_url` (TEXT): Document link
- `created_at` (TIMESTAMP)

**Indexes:**
- batch_id, inspector_id, grade, inspection_date

---

## Custom Types (ENUMs)

- **user_role**: farmer, distributor, retailer, admin
- **batch_status**: harvested, in_transit, delivered, processed, sold, cancelled
- **transaction_type**: transfer, pickup, delivery, inspection, sale
- **quality_grade**: A+, A, B+, B, C

---

## Views

### batch_details_view
Combines batch information with farmer details for efficient queries.

### supply_chain_view
Complete transaction history with user roles for supply chain visualization.

---

## Triggers

### update_updated_at_column()
Automatically updates the `updated_at` timestamp when records are modified in `users` and `batches` tables.

---

## Setup Instructions

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

**MacOS:**
```bash
brew install postgresql
```

**Windows:**
Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Using the setup script
cd backend/database
chmod +x setup.sh
./setup.sh
```

**Or manually:**

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE agri_supply_chain;

# Connect to database
\c agri_supply_chain

# Run schema
\i schema.sql

# Run seed data
\i seeds.sql

# Exit
\q
```

### 3. Configure Environment

Update `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agri_supply_chain
DB_USER=postgres
DB_PASSWORD=your_password
```

---

## Common Queries

### Get all batches with farmer details
```sql
SELECT * FROM batch_details_view WHERE status = 'harvested';
```

### Get complete supply chain for a batch
```sql
SELECT * FROM supply_chain_view WHERE batch_id = 'AG-2025-100001';
```

### Get farmer statistics
```sql
SELECT 
  u.name,
  COUNT(b.batch_id) as total_batches,
  SUM(b.quantity) as total_quantity
FROM users u
JOIN batches b ON u.user_id = b.farmer_id
WHERE u.role = 'farmer'
GROUP BY u.user_id, u.name;
```

### Get recent transactions
```sql
SELECT * FROM transactions 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## Backup and Restore

### Create Backup
```bash
pg_dump -U postgres agri_supply_chain > backup.sql
```

### Restore from Backup
```bash
psql -U postgres agri_supply_chain < backup.sql
```

---

## Performance Optimization

1. **Indexes**: All foreign keys and frequently queried columns are indexed
2. **Views**: Pre-joined views for common queries
3. **Connection Pooling**: Configured in `config/database.js`
4. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries

---

## Security Considerations

1. ✅ Passwords hashed with bcrypt (10 rounds)
2. ✅ Parameterized queries prevent SQL injection
3. ✅ Foreign key constraints ensure referential integrity
4. ✅ Role-based access control at application level
5. ✅ Sensitive data (passwords) never exposed in responses

---

## Maintenance

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size('agri_supply_chain'));
```

### Vacuum and Analyze
```sql
VACUUM ANALYZE;
```

### Check Active Connections
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'agri_supply_chain';
```

---

## Test Data

Seed data includes:
- 8 users (3 farmers, 2 distributors, 2 retailers, 1 admin)
- 8 batches with various crops
- 10 transactions showing complete supply chain flow
- 5 quality reports

**Test Login:** All users have password `password123`

---

## Troubleshooting

### Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### Permission Errors
```sql
GRANT ALL PRIVILEGES ON DATABASE agri_supply_chain TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### Reset Database
```bash
psql -U postgres -c "DROP DATABASE agri_supply_chain;"
psql -U postgres -c "CREATE DATABASE agri_supply_chain;"
psql -U postgres -d agri_supply_chain -f schema.sql
psql -U postgres -d agri_supply_chain -f seeds.sql
```

---

## Next Steps

After database setup:
1. ✅ Update .env with credentials
2. → Install backend dependencies: `npm install`
3. → Start backend server: `npm run dev`
4. → Test API endpoints using Postman/Thunder Client
5. → Deploy smart contracts to blockchain
6. → Connect frontend to backend APIs
