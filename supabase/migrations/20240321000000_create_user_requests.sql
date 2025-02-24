-- Create user requests table
CREATE TYPE request_status AS ENUM ('pending', 'completed', 'cancelled');

CREATE TABLE user_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL,
    step_id UUID REFERENCES recipe_steps(id),
    request_type TEXT NOT NULL,
    request_message TEXT NOT NULL,
    status request_status DEFAULT 'pending',
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_user_requests_recipe_id ON user_requests(recipe_id);
CREATE INDEX idx_user_requests_status ON user_requests(status);

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_user_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_user_requests_updated_at
    BEFORE UPDATE ON user_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_user_requests_updated_at(); 