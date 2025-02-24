-- Create missing ingredients table
CREATE TABLE missing_ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    status TEXT DEFAULT 'needed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_missing_ingredients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_missing_ingredients_updated_at
    BEFORE UPDATE ON missing_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_missing_ingredients_updated_at();
