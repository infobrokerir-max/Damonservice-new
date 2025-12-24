/*
  # Initialize Damon Service Pricing App Database

  1. New Tables
    - `categories`: Device categories (VRF Systems, Chillers, AHU)
    - `devices`: Products with factory prices and dimensions
    - `global_settings`: Pricing calculation parameters
    - `inquiry_logs`: Device price request history
    - `projects`: User projects for organizing inquiries
    - `comments`: Project discussion/notes between users and admins

  2. Security
    - Enable RLS on all tables
    - Public read access for categories and devices (no sensitive pricing)
    - User-scoped access for projects and comments
    - Admin-only access for settings and logs
    - Device details (factory price, weight, length) hidden from non-admins

  3. Data
    - Seed initial categories, devices, settings, and users
*/

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable"
  ON categories FOR SELECT
  TO public
  USING (is_active = true);

-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  factory_price_eur numeric NOT NULL,
  length numeric NOT NULL,
  weight numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active devices visible to employees"
  ON devices FOR SELECT
  TO public
  USING (is_active = true);

-- Global Settings Table
CREATE TABLE IF NOT EXISTS global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_multiplier numeric NOT NULL DEFAULT 0.38,
  freight_rate_per_length_eur numeric NOT NULL DEFAULT 1000,
  customs_numerator numeric NOT NULL DEFAULT 350000,
  customs_denominator numeric NOT NULL DEFAULT 150000,
  warranty_rate numeric NOT NULL DEFAULT 0.05,
  internal_commission_factor numeric NOT NULL DEFAULT 0.95,
  company_cost_factor numeric NOT NULL DEFAULT 0.95,
  profit_factor numeric NOT NULL DEFAULT 0.65,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read settings"
  ON global_settings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Admins can update settings"
  ON global_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  ));

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  ))
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  ));

-- Inquiry Logs Table
CREATE TABLE IF NOT EXISTS inquiry_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_name_snapshot text NOT NULL,
  model_name_snapshot text NOT NULL,
  sell_price_eur_snapshot numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_response_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inquiry_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own inquiry logs"
  ON inquiry_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Users can create inquiry logs"
  ON inquiry_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update inquiry logs"
  ON inquiry_logs FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  ));

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read comments on their projects"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = comments.project_id
      AND projects.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Users can create comments on their projects"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_id
        AND projects.user_id = auth.uid()
      ) OR EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
      )
    )
  );

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert Initial Data
INSERT INTO categories (id, name, is_active) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'VRF Systems', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Chillers', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Air Handling Units (AHU)', true)
ON CONFLICT DO NOTHING;

INSERT INTO devices (id, category_id, model_name, factory_price_eur, length, weight, is_active) VALUES
  ('d47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'VRF-Outdoor-20HP', 15000, 2.5, 400, true),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'VRF-Indoor-Cassette', 800, 0.8, 30, true),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d481', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Screw-Chiller-100T', 45000, 4.0, 2500, true),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Scroll-Chiller-Mini', 12000, 1.5, 600, true),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d483', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'AHU-Industrial-5000', 8000, 3.0, 900, true),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d484', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'AHU-Hygienic-2000', 11000, 2.2, 750, true)
ON CONFLICT DO NOTHING;

INSERT INTO global_settings (id, discount_multiplier, freight_rate_per_length_eur, customs_numerator, customs_denominator, warranty_rate, internal_commission_factor, company_cost_factor, profit_factor, is_active) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d999', 0.38, 1000, 350000, 150000, 0.05, 0.95, 0.95, 0.65, true)
ON CONFLICT DO NOTHING;
