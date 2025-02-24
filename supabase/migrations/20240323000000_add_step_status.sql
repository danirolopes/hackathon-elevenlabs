-- Create an enum type for step status
CREATE TYPE step_status AS ENUM (
    'unable_to_start',
    'ready_to_start',
    'in_progress',
    'ready_to_finish',
    'finished'
);

-- Add status column and remove is_completed
ALTER TABLE recipe_steps
    ADD COLUMN status step_status DEFAULT 'ready_to_start';

-- Drop the is_completed column after moving any completed steps to 'finished' status
UPDATE recipe_steps
SET status = 'finished'
WHERE is_completed = true;

ALTER TABLE recipe_steps
    DROP COLUMN is_completed; 