-- User Management Schema for Nutrify (Supabase PostgreSQL)

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles extend Supabase auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    birth_date DATE,
    gender TEXT,
    height_cm INTEGER,
    weight_kg NUMERIC,
    goal_calories INTEGER,
    goal_protein INTEGER,
    goal_water_ml INTEGER,  -- daily water goal in milliliters
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User allergies (many-to-many via junction table, but simple list)
CREATE TABLE IF NOT EXISTS user_allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    allergen TEXT NOT NULL,  -- e.g., 'peanuts', 'milk', 'eggs', 'tree nuts', 'soy', 'gluten', 'seafood', 'sesame'
    UNIQUE(user_id, allergen)
);

-- User diseases (for disease-specific advice)
CREATE TABLE IF NOT EXISTS user_diseases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    disease TEXT NOT NULL,  -- e.g., 'diabetes', 'hypertension', 'kidney disease', 'heart disease'
    UNIQUE(user_id, disease)
);

-- Meal logs (breakfast, lunch, dinner, snack)
CREATE TABLE IF NOT EXISTS meal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Individual food items within a meal
CREATE TABLE IF NOT EXISTS meal_food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_log_id UUID REFERENCES meal_logs(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,  -- e.g., 'g', 'ml', 'piece', 'cup'
    calories NUMERIC,
    protein NUMERIC,
    carbs NUMERIC,
    fat NUMERIC,
    fiber NUMERIC,
    sugar NUMERIC,
    sodium NUMERIC
);

-- Optional: Daily nutrition summary (can be a materialized view or computed on demand)
CREATE TABLE IF NOT EXISTS daily_nutrition (
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calories NUMERIC DEFAULT 0,
    total_protein NUMERIC DEFAULT 0,
    total_carbs NUMERIC DEFAULT 0,
    total_fat NUMERIC DEFAULT 0,
    total_fiber NUMERIC DEFAULT 0,
    total_sugar NUMERIC DEFAULT 0,
    total_sodium NUMERIC DEFAULT 0,
    total_water_ml NUMERIC DEFAULT 0,  -- water intake logged separately if needed
    PRIMARY KEY (user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_id ON meal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_logged_at ON meal_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_meal_food_items_meal_log_id ON meal_food_items(meal_log_id);
CREATE INDEX IF NOT EXISTS idx_daily_nutrition_user_date ON daily_nutrition(user_id, date);

-- Trigger to update updated_at on user_profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Note: For water intake, you could either log water as a food item or have a separate water_log table.
-- For simplicity, we allow water to be logged as a food item with unit 'ml' and track via daily_nutrition.
-- Alternatively, create a water_log table similar to meal_food_items.

-- Example queries:
-- 1. Get user profile with allergies and diseases
-- SELECT up.*,
--        array_agg(DISTINCT ua.allergen) FILTER (WHERE ua.allergen IS NOT NULL) AS allergies,
--        array_agg(DISTINCT ud.disease) FILTER (WHERE ud.disease IS NOT NULL) AS diseases
-- FROM user_profiles up
-- LEFT JOIN user_allergies ua ON up.id = ua.user_id
-- LEFT JOIN user_diseases ud ON up.id = ud.user_id
-- WHERE up.id = $1
-- GROUP BY up.id;

-- 2. Get meals for a user on a specific day
-- SELECT ml.*, mfi.*
-- FROM meal_logs ml
-- JOIN meal_food_items mfi ON ml.id = mfi.meal_log_id
-- WHERE ml.user_id = $1 AND ml.logged_at::date = $2
-- ORDER BY ml.logged_at;

-- 3. Get daily nutrition totals (if using daily_nutrition table)
-- SELECT * FROM daily_nutrition WHERE user_id = $1 AND date = $2;
