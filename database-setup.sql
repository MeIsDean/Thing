-- Game Dashboard - Supabase SQL Setup
-- Copy and paste this into the Supabase SQL Editor to set up your database

-- Create user_profiles table
CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE inventory (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_inventory_user_id ON inventory(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for inventory
CREATE POLICY "Users can view their own inventory"
  ON inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert items to their inventory"
  ON inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory"
  ON inventory FOR DELETE
  USING (auth.uid() = user_id);
