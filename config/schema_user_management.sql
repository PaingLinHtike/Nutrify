-- ============================================================
-- Nutrify - Complete Database Schema (Supabase PostgreSQL)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USER PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    birth_date DATE,
    gender TEXT,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    activity_level TEXT,           -- sedentary, light, moderate, active, very_active
    diet_goal TEXT,                -- lose_weight, maintain, gain_muscle
    diet_type TEXT,                -- omnivore, vegetarian, vegan, keto
    goal_calories INTEGER DEFAULT 2000,
    goal_protein NUMERIC DEFAULT 120,
    goal_carbs NUMERIC DEFAULT 250,
    goal_fat NUMERIC DEFAULT 65,
    goal_water_ml INTEGER DEFAULT 3000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. FOOD IMAGES (uploaded food photos → model prediction)
-- ============================================================
CREATE TABLE IF NOT EXISTS food_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,               -- Supabase Storage URL
    height_px INT,
    width_px INT,
    predicted_label TEXT,                  -- from 100-food model
    confidence_score DECIMAL(4,3),         -- 0.000 - 1.000
    source TEXT DEFAULT 'user_upload',     -- camera, gallery
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_food_images_user ON food_images(user_id, uploaded_at DESC);

-- ============================================================
-- 3. MEALS (breakfast / lunch / dinner / snack)
-- ============================================================
CREATE TABLE IF NOT EXISTS meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_id UUID REFERENCES food_images(id) ON DELETE SET NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_name TEXT NOT NULL,
    serving_size_g INT DEFAULT 100,
    calories DECIMAL(7,2) DEFAULT 0,
    protein_g DECIMAL(5,1) DEFAULT 0,
    fat_g DECIMAL(5,1) DEFAULT 0,
    carbs_g DECIMAL(5,1) DEFAULT 0,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);
CREATE INDEX idx_meals_user_date ON meals(user_id, logged_at DESC);
CREATE INDEX idx_meals_user_type ON meals(user_id, meal_type, logged_at DESC);

-- ============================================================
-- 4. WATER INTAKE
-- ============================================================
CREATE TABLE IF NOT EXISTS water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_ml INT NOT NULL,                -- e.g., 250, 500
    logged_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_water_user_date ON water_logs(user_id, logged_at DESC);

-- ============================================================
-- 5. DAILY SUMMARIES (1 row per user per day)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calories DECIMAL(7,2) DEFAULT 0,
    total_protein_g DECIMAL(6,1) DEFAULT 0,
    total_fat_g DECIMAL(6,1) DEFAULT 0,
    total_carbs_g DECIMAL(6,1) DEFAULT 0,
    total_water_ml INT DEFAULT 0,
    meal_count INT DEFAULT 0,
    calorie_goal_met BOOLEAN DEFAULT FALSE,
    protein_goal_met BOOLEAN DEFAULT FALSE,
    water_goal_met BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, date)
);
CREATE INDEX idx_daily_user ON daily_summaries(user_id, date DESC);

-- ============================================================
-- 6. USER ALLERGIES (for Allergy Detection feature #5)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    allergen TEXT NOT NULL,                -- peanuts, milk, eggs, tree_nuts, soy, gluten, seafood, sesame
    UNIQUE(user_id, allergen)
);
CREATE INDEX idx_allergies_user ON user_allergies(user_id);

-- ============================================================
-- 7. USER DISEASES (for Disease-Specific Advice feature #14)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_diseases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    disease TEXT NOT NULL,                 -- diabetes, hypertension, kidney_disease, heart_disease
    UNIQUE(user_id, disease)
);
CREATE INDEX idx_diseases_user ON user_diseases(user_id);

-- ============================================================
-- 8. FOOD NUTRITION REFERENCE (100+ foods lookup table)
-- ============================================================
CREATE TABLE IF NOT EXISTS food_nutrition (
    food_name TEXT PRIMARY KEY,            -- e.g., "apple", "chicken_breast"
    calories_per_100g DECIMAL(6,1),
    protein_g_per_100g DECIMAL(5,1),
    fat_g_per_100g DECIMAL(5,1),
    carbs_g_per_100g DECIMAL(5,1),
    fiber_g_per_100g DECIMAL(5,1),
    sugar_g_per_100g DECIMAL(5,1),
    sodium_mg_per_100g DECIMAL(6,1),
    health_score DECIMAL(3,1),             -- 0.0 - 10.0
    allergens TEXT[],                      -- ARRAY of allergens present: {peanuts, milk, ...}
    category TEXT,                         -- fruit, vegetable, meat, dairy, grain, seafood, nut, etc.
    diabetes_warning TEXT,                 -- "High sugar — not recommended" or NULL
    hypertension_warning TEXT,             -- "High sodium — limit intake" or NULL
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. ALLERGEN-FOOD MAPPING (which foods trigger which allergies)
-- ============================================================
CREATE TABLE IF NOT EXISTS allergen_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allergen TEXT NOT NULL,                -- peanuts, milk, eggs, etc.
    food_keywords TEXT[] NOT NULL,         -- ARRAY of food names/ingredients containing this allergen
    UNIQUE(allergen)
);

-- Seed allergen mappings
INSERT INTO allergen_foods (allergen, food_keywords) VALUES
    ('milk',        ARRAY['milk', 'cheese', 'butter', 'yogurt', 'cream', 'mozzarella', 'cheddar', 'whey', 'casein']),
    ('eggs',        ARRAY['egg', 'eggs', 'mayonnaise', 'meringue', 'custard']),
    ('peanuts',     ARRAY['peanuts', 'peanut_butter', 'peanut', 'groundnut']),
    ('tree_nuts',   ARRAY['almonds', 'walnuts', 'cashews', 'pistachios', 'pecans', 'hazelnuts', 'macadamia', 'coconut']),
    ('soy',         ARRAY['soybeans', 'tofu', 'soy', 'edamame', 'tempeh', 'miso']),
    ('gluten',      ARRAY['bread', 'pasta', 'noodles', 'bagel', 'wheat', 'barley', 'rye', 'flour', 'couscous']),
    ('seafood',     ARRAY['shrimp', 'crab', 'lobster', 'salmon', 'tuna', 'cod', 'tilapia', 'sardines', 'squid', 'mussels', 'oysters', 'clams']),
    ('sesame',      ARRAY['sesame_seeds', 'tahini', 'sesame'])
ON CONFLICT (allergen) DO NOTHING;

-- ============================================================
-- 10. FOOD METADATA LOG (existing from database.py)
-- ============================================================
CREATE TABLE IF NOT EXISTS food_metadata (
    id SERIAL PRIMARY KEY,
    image_id VARCHAR(36) UNIQUE NOT NULL,
    upload_time TIMESTAMP NOT NULL,
    height INTEGER,
    width INTEGER,
    email VARCHAR(255),
    country VARCHAR(100),
    label VARCHAR(50) NOT NULL,
    source VARCHAR(50) DEFAULT 'web-app',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_updated ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_food_nutrition_updated ON food_nutrition;
CREATE TRIGGER trg_food_nutrition_updated
    BEFORE UPDATE ON food_nutrition
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Enable per-table
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/update their own data
CREATE POLICY "Users own their profile" ON user_profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users own their allergies" ON user_allergies
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their diseases" ON user_diseases
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their meals" ON meals
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their water logs" ON water_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their summaries" ON daily_summaries
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their food images" ON food_images
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public read for reference tables
CREATE POLICY "Anyone can read nutrition data" ON food_nutrition
    FOR SELECT USING (true);

CREATE POLICY "Anyone can read allergen mappings" ON allergen_foods
    FOR SELECT USING (true);
-- ============================================================
-- 11. SEED DATA: food_nutrition (95 foods, per-100g values)
-- Generated from target_hundred_whole_food_nutrition_info.csv
-- ============================================================
INSERT INTO food_nutrition (food_name, calories_per_100g, protein_g_per_100g, fat_g_per_100g, carbs_g_per_100g) VALUES
    ('peanut_butter', 597.0, 22.5, 51.1, 22.3),
    ('cheddar_cheese', 366.0, 18.0, 30.6, 5.27),
    ('peach', 42.0, 0.91, 0.27, 10.1),
    ('kiwi', 58.0, 1.06, 0.44, 14.0),
    ('cantaloupe', 34.0, 0.82, 0.18, 8.16),
    ('egg', 575.0, 48.1, 39.8, 1.87),
    ('chicken_wings', 156.0, 23.9, 5.95, 0.0),
    ('bread', 254.0, 12.3, 3.55, 43.1),
    ('beef', 219.0, 27.3, 11.4, 0.0),
    ('carrots', 37.0, 0.81, 0.47, 7.92),
    ('figs', 249.0, 3.3, 0.92, 63.9),
    ('orange', 47.0, 0.91, 0.15, 11.8),
    ('pear', 57.0, 0.38, 0.16, 15.1),
    ('milk', 60.0, 3.27, 3.2, 4.63),
    ('broccoli', 31.0, 2.57, 0.34, 6.27),
    ('bacon', 500.0, 40.9, 36.5, 2.1),
    ('butter', 739.8000000000001, 0.85, 82.2, 0.1),
    ('garlic', 143.0, 6.62, 0.38, 28.2),
    ('onion', 35.0, 0.89, 0.13, 7.68),
    ('banana', 97.0, 0.74, 0.29, 23.0),
    ('apple', 55.622745, 0.1875, 0.2125, 14.7817),
    ('mushrooms', 24.8732585, 2.890625, 0.3708, 4.079375),
    ('spinach', 20.72851125, 2.851875, 0.6188, 2.406325),
    ('bell_pepper', 19.692148, 0.715, 0.1063, 4.7781),
    ('yogurt', 77.3185458, 3.824172, 4.484, 5.574928),
    ('raspberries', 51.412425, 1.008125, 0.1875, 12.904375),
    ('blueberries', 57.384621, 0.703125, 0.3063, 14.571775),
    ('grapes', 77.151876, 0.914375, 0.1638, 20.196825),
    ('lettuce', 14.455425, 0.7425, 0.07375, 3.36875),
    ('almonds', 583.597022, 21.45038, 51.09, 20.03462),
    ('walnuts', 678.66434, 14.5644, 69.74, 10.9096),
    ('oats', 378.866123, 13.49645, 5.89, 68.65755),
    ('pineapple', 54.046596, 0.4609375, 0.2113, 14.0914625),
    ('cherries', 63.290775, 1.039375, 0.1925, 16.163125),
    ('potato', 80.9523625, 2.27375, 0.36, 17.77125),
    ('sweet_potato', 77.35727375, 1.578125, 0.375, 17.327875),
    ('celery', 14.83215875, 0.4921875, 0.1625, 3.3165125),
    ('cucumber', 13.934925, 0.625, 0.1775, 2.9525),
    ('cabbage', 27.8695, 0.96125, 0.2275, 6.38375),
    ('strawberries', 32.66565, 0.640625, 0.22, 7.964375),
    ('rice', 369.637321, 7.03885, 1.033, 80.31315),
    ('turkey_breast', 157.5897, 17.34375, 9.591, 0.0),
    ('peanuts', 550.62181, 23.205, 43.28, 26.498),
    ('pistachios', 560.68798, 20.5057, 45.02, 27.6943),
    ('pumpkin_seeds', 514.83917, 29.9079, 40.03, 18.6751),
    ('chickpeas', 371.99469, 21.275, 6.274, 60.358),
    ('lentils', 350.9328, 23.56875, 1.925, 62.17125),
    ('peas', 77.798925, 4.734375, 1.153, 12.707625),
    ('pork_chop', 173.72307, 21.11875, 9.469, 0.0),
    ('Cheese, provolone, sliced', 356.900072, 23.45288, 28.13, 2.45312),
    ('salmon', 136.22202, 22.3, 4.936, 0.0),
    ('tilapia', 99.95727, 19.0, 2.479, 0.0),
    ('shrimp', 75.699433, 15.56875, 0.8013, 0.48495),
    ('cod', 70.477065, 16.06875, 0.6675, 0.0),
    ('crab', 86.021115, 18.65, 0.8075, 0.0),
    ('zucchini', 16.0, 0.984375, 0.205, 3.27),
    ('cauliflower', 22.85237775, 1.640625, 0.2375, 4.723075),
    ('beetroot', 40.965255, 1.6875, 0.3025, 8.787),
    ('eggplant', 22.35856525, 0.851875, 0.12, 5.399325),
    ('tomato', 19.149449, 0.8675, 0.2063, 4.2874),
    ('chicken_thigh', 226.0, 22.51, 15.08, 0.12),
    ('duck_breast', 336.0, 18.91, 28.23, 0.0),
    ('sardines', 208.0, 24.62, 11.45, 0.0),
    ('noodles', 189.0, 11.37, 8.41, 16.24),
    ('black_beans', 181.0, 8.23, 7.01, 22.04),
    ('kidney_beans', 177.0, 8.06, 6.97, 21.19),
    ('soybeans', 218.0, 16.92, 14.84, 7.77),
    ('cashews', 584.0, 14.85, 47.96, 31.71),
    ('coconut', 456.0, 3.13, 27.99, 51.85),
    ('sunflower_seeds', 582.0, 19.33, 49.8, 24.07),
    ('sesame_seeds', 631.0, 20.45, 61.21, 11.73),
    ('bagel', 264.0, 10.56, 1.32, 52.38),
    ('popcorn', 518.0, 9.13, 30.57, 54.99),
    ('brown_rice', 162.0, 6.4, 4.54, 24.29),
    ('dates', 282.0, 2.45, 0.39, 75.03),
    ('papaya', 43.0, 0.47, 0.26, 10.82),
    ('pomegranate', 83.0, 1.67, 1.17, 18.7),
    ('green_beans', 28.0, 1.49, 0.17, 6.43),
    ('honey', 304.0, 0.3, 0.0, 82.4),
    ('apricot', 43.47915, 0.96125, 0.405, 10.23875),
    ('chia_seeds', 490.09552, 17.013, 32.89, 38.273),
    ('asparagus', 23.529215, 1.4375, 0.2163, 5.1012),
    ('avocado', 206.0493, 1.8125, 20.31, 8.3235),
    ('corn', 72.85765625, 2.789375, 1.626, 14.689625),
    ('mango', 61.635825, 0.5625, 0.5725, 15.265),
    ('plum', 52.747095, 0.578125, 0.2825, 13.455575),
    ('lamb_chop', 241.727079, 17.4625, 18.64, 0.0),
    ('pumpkin', 3.4175, 0.854375, 0.1, 6.5),
    ('blackberries', 6.105, 1.52625, 0.49, 9.61),
    ('lobster', 58.8175, 12.99375, 0.3667, 0.88555),
    ('radish', 19.600450000000002, 0.65625, 0.08313, 4.05682),
    ('squid', 43.9108, 8.80625, 0.5508, 0.93215),
    ('tuna', 101.86949999999999, 24.7, 0.3875, 0.0),
    ('turnip', 33.98160000000001, 0.953125, 0.1188, 7.274975),
    ('watermelon', 3.485, 0.87125, 0.2, 7.6)
ON CONFLICT (food_name) DO UPDATE SET
    calories_per_100g = EXCLUDED.calories_per_100g,
    protein_g_per_100g = EXCLUDED.protein_g_per_100g,
    fat_g_per_100g = EXCLUDED.fat_g_per_100g,
    carbs_g_per_100g = EXCLUDED.carbs_g_per_100g;
