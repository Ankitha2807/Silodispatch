#!/bin/bash

# SiloDispatch - One-Command Setup Script
# This script sets up the entire SiloDispatch system including backend, frontend, and database

set -e  # Exit on any error

echo "🚀 SiloDispatch - Complete System Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) detected"
}

# Check if MongoDB is running
check_mongodb() {
    if ! command -v mongod &> /dev/null; then
        print_warning "MongoDB not found. Please install MongoDB or use MongoDB Atlas."
        print_warning "For local development, install MongoDB Community Edition."
        return 1
    fi
    
    if pgrep -x "mongod" > /dev/null; then
        print_success "MongoDB is running"
        return 0
    else
        print_warning "MongoDB is not running. Please start MongoDB service."
        return 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    
    print_status "Installing frontend dependencies..."
    cd ../frontend
    npm install
    
    cd ..
    print_success "All dependencies installed"
}

# Setup environment variables
setup_env() {
    print_status "Setting up environment variables..."
    
    # Backend .env
    if [ ! -f backend/.env ]; then
        cat > backend/.env << EOF
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/silodispatch

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server Configuration
PORT=5000
NODE_ENV=development

# Geocoding API (Optional - for real coordinates)
OPENCAGE_API_KEY=your-opencage-api-key

# Razorpay Configuration (Optional - for UPI payments)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EOF
        print_success "Backend .env file created"
    else
        print_warning "Backend .env file already exists"
    fi
    
    # Frontend .env
    if [ ! -f frontend/.env ]; then
        cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
EOF
        print_success "Frontend .env file created"
    else
        print_warning "Frontend .env file already exists"
    fi
}

# Initialize database
init_database() {
    print_status "Initializing database..."
    
    # Create initial data script
    cat > scripts/init-db.js << 'EOF'
const mongoose = require('mongoose');
const User = require('../backend/src/models/User');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silodispatch');
        console.log('Connected to MongoDB');

        // Check if admin user exists
        const adminExists = await User.findOne({ role: 'ADMIN' });
        if (!adminExists) {
            // Create admin user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'System Admin',
                email: 'admin@silodispatch.com',
                password: hashedPassword,
                role: 'ADMIN',
                phone: '9876543210'
            });
            console.log('✅ Admin user created: admin@silodispatch.com / admin123');
        }

        // Check if supervisor user exists
        const supervisorExists = await User.findOne({ role: 'SUPERVISOR' });
        if (!supervisorExists) {
            // Create supervisor user
            const hashedPassword = await bcrypt.hash('supervisor123', 10);
            await User.create({
                name: 'Supervisor',
                email: 'supervisor@silodispatch.com',
                password: hashedPassword,
                role: 'SUPERVISOR',
                phone: '9876543211'
            });
            console.log('✅ Supervisor user created: supervisor@silodispatch.com / supervisor123');
        }

        // Check if driver user exists
        const driverExists = await User.findOne({ role: 'DRIVER' });
        if (!driverExists) {
            // Create driver user
            const hashedPassword = await bcrypt.hash('driver123', 10);
            await User.create({
                name: 'Demo Driver',
                email: 'driver@silodispatch.com',
                password: hashedPassword,
                role: 'DRIVER',
                phone: '9876543212'
            });
            console.log('✅ Driver user created: driver@silodispatch.com / driver123');
        }

        console.log('✅ Database initialized successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

initDatabase();
EOF

    # Run database initialization
    cd backend
    node ../scripts/init-db.js
    cd ..
    
    print_success "Database initialized with demo users"
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    cd frontend
    npm run build
    cd ..
    print_success "Frontend built successfully"
}

# Create startup scripts
create_startup_scripts() {
    print_status "Creating startup scripts..."
    
    # Development startup script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting SiloDispatch in development mode..."

# Start backend
cd backend
npm run dev &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "✅ SiloDispatch started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo "📊 API Docs: http://localhost:5000/api-docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
EOF

    # Production startup script
    cat > start-prod.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting SiloDispatch in production mode..."

# Build frontend
cd frontend
npm run build
cd ..

# Start backend (serves frontend)
cd backend
npm start
EOF

    # Make scripts executable
    chmod +x start-dev.sh start-prod.sh
    
    print_success "Startup scripts created"
}

# Create demo data
create_demo_data() {
    print_status "Creating demo data..."
    
    cat > scripts/create-demo-data.js << 'EOF'
const mongoose = require('mongoose');
const Order = require('../backend/src/models/Order');

async function createDemoData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silodispatch');
        
        // Sample orders for demonstration
        const demoOrders = [
            {
                customerName: 'John Doe',
                address: 'Mumbai Central Station',
                pincode: '400008',
                customerPhone: '9876543210',
                weight: 5,
                amount: 1200,
                paymentType: 'COD',
                status: 'PENDING'
            },
            {
                customerName: 'Jane Smith',
                address: 'Andheri Station',
                pincode: '400058',
                customerPhone: '9876543211',
                weight: 8,
                amount: 1800,
                paymentType: 'UPI',
                status: 'PENDING'
            },
            {
                customerName: 'Bob Wilson',
                address: 'Bandra Station',
                pincode: '400050',
                customerPhone: '9876543212',
                weight: 12,
                amount: 2500,
                paymentType: 'PREPAID',
                status: 'PENDING'
            },
            {
                customerName: 'Alice Brown',
                address: 'Dadar Station',
                pincode: '400014',
                customerPhone: '9876543213',
                weight: 6,
                amount: 1500,
                paymentType: 'COD',
                status: 'PENDING'
            },
            {
                customerName: 'Charlie Davis',
                address: 'Borivali Station',
                pincode: '400066',
                customerPhone: '9876543214',
                weight: 10,
                amount: 2200,
                paymentType: 'UPI',
                status: 'PENDING'
            }
        ];

        // Clear existing orders
        await Order.deleteMany({});
        
        // Insert demo orders
        await Order.insertMany(demoOrders);
        
        console.log('✅ Demo data created successfully');
        console.log('📦 Created 5 sample orders for testing');
        process.exit(0);
    } catch (error) {
        console.error('❌ Demo data creation failed:', error);
        process.exit(1);
    }
}

createDemoData();
EOF

    cd backend
    node ../scripts/create-demo-data.js
    cd ..
    
    print_success "Demo data created"
}

# Main setup function
main() {
    print_status "Starting SiloDispatch setup..."
    
    # Check prerequisites
    check_node
    check_mongodb || print_warning "MongoDB check failed - you may need to install/start MongoDB"
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_env
    
    # Initialize database
    init_database
    
    # Create demo data
    create_demo_data
    
    # Build frontend
    build_frontend
    
    # Create startup scripts
    create_startup_scripts
    
    echo ""
    echo "🎉 SiloDispatch setup completed successfully!"
    echo "============================================="
    echo ""
    echo "📋 Next Steps:"
    echo "1. Start the system: ./start-dev.sh"
    echo "2. Open browser: http://localhost:3000"
    echo "3. Login with demo credentials:"
    echo "   - Admin: admin@silodispatch.com / admin123"
    echo "   - Supervisor: supervisor@silodispatch.com / supervisor123"
    echo "   - Driver: driver@silodispatch.com / driver123"
    echo ""
    echo "📚 Documentation:"
    echo "- API Docs: http://localhost:5000/api-docs"
    echo "- Clustering Demo: Run 'node scripts/clusteringBenchmark.js'"
    echo "- Architecture: See docs/architecture.md"
    echo ""
    echo "🔧 Configuration:"
    echo "- Backend config: backend/.env"
    echo "- Frontend config: frontend/.env"
    echo ""
    echo "🚀 Ready to optimize your delivery operations!"
}

# Run main function
main 