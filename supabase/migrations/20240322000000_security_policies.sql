-- Enable RLS
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for recipe_steps
CREATE POLICY "Enable read access for authenticated users"
    ON recipe_steps
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for service role"
    ON recipe_steps
    FOR ALL
    TO service_role
    USING (true);

-- Create policies for user_requests
CREATE POLICY "Enable read access for authenticated users"
    ON user_requests
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write access for authenticated users"
    ON user_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
    ON user_requests
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable all access for service role"
    ON user_requests
    FOR ALL
    TO service_role
    USING (true); 