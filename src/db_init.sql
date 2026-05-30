-- Delivery API Keys table
CREATE TABLE IF NOT EXISTS delivery_api_keys (
  id INTEGER PRIMARY KEY,
  swiggy_key TEXT,
  zomato_key TEXT
);
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  restaurant_name VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  temp_password_expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  table_number INTEGER,
  items TEXT[] NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Menu table
CREATE TABLE IF NOT EXISTS menu (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  available BOOLEAN DEFAULT true,
  image_url TEXT
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  unit VARCHAR(20) NOT NULL,
  min_stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(80) NOT NULL DEFAULT 'General',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Superadmin restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  owner VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  plan VARCHAR(20) NOT NULL DEFAULT 'Standard' CHECK (plan IN ('Standard', 'Premium'))
);

-- Superadmin subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  restaurant_name VARCHAR(120) NOT NULL,
  owner VARCHAR(120) NOT NULL,
  plan VARCHAR(20) NOT NULL DEFAULT 'Standard' CHECK (plan IN ('Standard', 'Premium')),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  expiry_date DATE NOT NULL
);

-- Superadmin settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  setting_key VARCHAR(120) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE
);

-- Superadmin support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  subject VARCHAR(255) NOT NULL,
  restaurant VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Payroll staff table
CREATE TABLE IF NOT EXISTS payroll_staff (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  name VARCHAR(120) NOT NULL,
  role VARCHAR(80) NOT NULL,
  present BOOLEAN NOT NULL DEFAULT true,
  leaves INTEGER NOT NULL DEFAULT 0,
  salary NUMERIC(10,2) NOT NULL CHECK (salary >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  prep_time INTEGER NOT NULL CHECK (prep_time > 0),
  stock VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (stock IN ('Available', 'Unavailable')),
  image TEXT,
  ingredients TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  title VARCHAR(255) NOT NULL,
  assigned_to VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CRM Customers table
CREATE TABLE IF NOT EXISTS crm_customers (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(140) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  vip BOOLEAN NOT NULL DEFAULT FALSE,
  last_visit TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tables (restaurant seating) table
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id SERIAL PRIMARY KEY,
  table_number INTEGER NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  section VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  occupied_since TIMESTAMP,
  current_order VARCHAR(120),
  reserved_by VARCHAR(120),
  estimated_time INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(120),
  reservation_date DATE NOT NULL,
  reservation_time VARCHAR(10) NOT NULL,
  guests INTEGER NOT NULL CHECK (guests > 0),
  table_id INTEGER REFERENCES restaurant_tables(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- Kitchen Orders table
CREATE TABLE IF NOT EXISTS kitchen_orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL,
  table_number VARCHAR(20) NOT NULL,
  items JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  order_type VARCHAR(20) NOT NULL DEFAULT 'dine-in' CHECK (order_type IN ('dine-in', 'takeout', 'delivery')),
  estimated_time INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_address TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  driver_name VARCHAR(120),
  driver_phone VARCHAR(20),
  partner VARCHAR(20) NOT NULL DEFAULT 'in-house' CHECK (partner IN ('in-house', 'uber-eats', 'doordash', 'zomato', 'swiggy')),
  order_total NUMERIC(10,2) NOT NULL CHECK (order_total >= 0),
  estimated_delivery_time TIMESTAMP,
  delivered_at TIMESTAMP,
  tracking_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
