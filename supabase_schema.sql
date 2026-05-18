-- ==========================================
-- SUPABASE SQL SCHEMA FOR EASYSCAN WMS
-- ==========================================

-- 1. Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Locations
INSERT INTO locations (id, name, code, address) VALUES
('vastral', 'Vastral', 'VST-01', 'Vastral Warehouse, Ring Road'),
('bopal', 'Bopal', 'BPL-02', 'Bopal Hub, S.P. Ring Road'),
('shela', 'Shela', 'SHL-03', 'Shela Logistics Park'),
('surat', 'Surat', 'SRT-04', 'Surat Textile Hub, Kamrej'),
('nexa_rbi', 'Nexa RBI', 'NEX-05', 'Nexa RBI Regional Hub')
ON CONFLICT (id) DO NOTHING;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    location_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Users
INSERT INTO users (username, password, role, name, location_id) VALUES
('pegasus.spare', 'spare321', 'admin', 'Master Admin', 'all'),
('vastral.user', '123', 'user', 'Vastral Manager', 'vastral'),
('bopal.user', '123', 'user', 'Bopal Manager', 'bopal'),
('shela.user', '123', 'user', 'Shela Manager', 'shela'),
('surat.user', '123', 'user', 'Surat Manager', 'surat'),
('nexa.user', '123', 'user', 'Nexa Manager', 'nexa_rbi')
ON CONFLICT (username) DO NOTHING;

-- 3. Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id TEXT NOT NULL,
    invoice_no TEXT NOT NULL,
    tracking_no TEXT,
    truck_no TEXT,
    gate_pass TEXT,
    transporter TEXT,
    total_boxes INT DEFAULT 0,
    total_parts INT DEFAULT 0,
    boxes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Parts Table
CREATE TABLE IF NOT EXISTS parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id TEXT NOT NULL,
    invoice_no TEXT NOT NULL,
    part_number TEXT NOT NULL,
    description TEXT,
    container_no TEXT,
    ship_lp_no TEXT,
    qty INT DEFAULT 0,
    bin_location TEXT,
    gate_pass TEXT,
    is_urgent BOOLEAN DEFAULT FALSE,
    urgent_details JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Scans Table (Tracks Received Boxes & Verified Parts)
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id TEXT NOT NULL,
    scan_key TEXT NOT NULL, -- e.g., 'BOX_ID' or 'PART_NO||BOX_ID'
    scan_type TEXT NOT NULL, -- 'box' or 'part'
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    scanned_by TEXT
);

-- 6. Selected Invoices Table
CREATE TABLE IF NOT EXISTS selected_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id TEXT NOT NULL,
    invoice_no TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (Optional / Allow All for easy start)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_invoices ENABLE ROW LEVEL SECURITY;

-- Create Policies to allow all operations (Public access for easy Vercel integration)
CREATE POLICY "Allow All on locations" ON locations FOR ALL USING (true);
CREATE POLICY "Allow All on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow All on shipments" ON shipments FOR ALL USING (true);
CREATE POLICY "Allow All on parts" ON parts FOR ALL USING (true);
CREATE POLICY "Allow All on scans" ON scans FOR ALL USING (true);
CREATE POLICY "Allow All on selected_invoices" ON selected_invoices FOR ALL USING (true);
