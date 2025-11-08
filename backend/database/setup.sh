#!/bin/bash

# FarmChain Database Setup Script
# This script creates the PostgreSQL database and runs migrations

set -e

echo "🌾 FarmChain Database Setup"
echo "============================"
echo ""

# Configuration
DB_NAME="agri_supply_chain"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed!${NC}"
    echo "Please install PostgreSQL first:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "  MacOS: brew install postgresql"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL found"

# Check if PostgreSQL service is running
if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} PostgreSQL service is not running"
    echo "Starting PostgreSQL service..."
    
    # Try to start PostgreSQL (different commands for different systems)
    if command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql
    elif command -v brew &> /dev/null; then
        brew services start postgresql
    else
        echo -e "${RED}❌ Could not start PostgreSQL automatically${NC}"
        echo "Please start PostgreSQL manually and run this script again"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} PostgreSQL service is running"

# Create database
echo ""
echo "📦 Creating database: $DB_NAME"
echo "================================"

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}⚠${NC} Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo "Creating new database..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
        echo -e "${GREEN}✓${NC} Database recreated"
    else
        echo "Skipping database creation"
    fi
else
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✓${NC} Database created"
fi

# Run schema migration
echo ""
echo "📋 Running schema migration"
echo "============================"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$(dirname "$0")/schema.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Schema migration completed"
else
    echo -e "${RED}❌ Schema migration failed${NC}"
    exit 1
fi

# Ask if user wants to load seed data
echo ""
read -p "Do you want to load seed data for testing? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo ""
    echo "🌱 Loading seed data"
    echo "===================="
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$(dirname "$0")/seeds.sql"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Seed data loaded"
    else
        echo -e "${RED}❌ Seed data loading failed${NC}"
        exit 1
    fi
fi

# Generate .env file if it doesn't exist
echo ""
echo "⚙️  Configuring environment"
echo "==========================="

ENV_FILE="$(dirname "$0")/../.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file..."
    cp "$(dirname "$0")/../.env.example" "$ENV_FILE"
    
    # Update database configuration in .env
    sed -i.bak "s/DB_NAME=.*/DB_NAME=$DB_NAME/" "$ENV_FILE"
    sed -i.bak "s/DB_USER=.*/DB_USER=$DB_USER/" "$ENV_FILE"
    sed -i.bak "s/DB_HOST=.*/DB_HOST=$DB_HOST/" "$ENV_FILE"
    sed -i.bak "s/DB_PORT=.*/DB_PORT=$DB_PORT/" "$ENV_FILE"
    
    rm -f "$ENV_FILE.bak"
    
    echo -e "${GREEN}✓${NC} .env file created"
    echo -e "${YELLOW}⚠${NC} Please update .env file with your database password and other configurations"
else
    echo ".env file already exists"
fi

# Final summary
echo ""
echo "================================"
echo -e "${GREEN}✅ Database setup completed!${NC}"
echo "================================"
echo ""
echo "Database Details:"
echo "  - Name: $DB_NAME"
echo "  - Host: $DB_HOST"
echo "  - Port: $DB_PORT"
echo "  - User: $DB_USER"
echo ""
echo "Next steps:"
echo "  1. Update .env file with your database password"
echo "  2. Install dependencies: npm install"
echo "  3. Start the server: npm run dev"
echo ""
echo "Test credentials (if seed data was loaded):"
echo "  - Farmer: ramesh@farm.in / password123"
echo "  - Distributor: dist@quicktransport.in / password123"
echo "  - Retailer: retail@freshmart.in / password123"
echo "  - Admin: admin@farmchain.in / password123"
echo ""
