-- Enable Row Level Security
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policies for devices
CREATE POLICY "Public devices are viewable by everyone"
ON devices FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own devices"
ON devices FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own devices"
ON devices FOR UPDATE
USING (true);

-- Create policies for agents
CREATE POLICY "Public agents are viewable by everyone"
ON agents FOR SELECT
USING (is_public OR auth.uid()::text = owner_address);

CREATE POLICY "Users can insert their own agents"
ON agents FOR INSERT
WITH CHECK (auth.uid()::text = owner_address);

CREATE POLICY "Users can update their own agents"
ON agents FOR UPDATE
USING (auth.uid()::text = owner_address); 