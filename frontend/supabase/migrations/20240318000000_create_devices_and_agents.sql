-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_model TEXT NOT NULL,
    ram TEXT NOT NULL,
    storage TEXT NOT NULL,
    cpu TEXT,
    ngrok_url TEXT NOT NULL,
    wallet_address TEXT NOT NULL UNIQUE,
    hosting_fee TEXT NOT NULL,
    agent_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tx_hash TEXT NOT NULL UNIQUE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    subname TEXT NOT NULL UNIQUE,
    description TEXT,
    personality TEXT,
    scenario TEXT,
    first_mes TEXT,
    mes_example TEXT,
    creator_comment TEXT,
    tags TEXT[] DEFAULT '{}',
    talkativeness NUMERIC(4,2),
    is_favorite BOOLEAN DEFAULT false,
    device_address TEXT NOT NULL REFERENCES devices(wallet_address),
    owner_address TEXT NOT NULL,
    per_api_call_fee TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    tools TEXT[] DEFAULT '{}',
    metadata_url TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_devices_wallet_address ON devices(wallet_address);
CREATE INDEX IF NOT EXISTS idx_agents_device_address ON agents(device_address);
CREATE INDEX IF NOT EXISTS idx_agents_owner_address ON agents(owner_address);
CREATE INDEX IF NOT EXISTS idx_agents_subname ON agents(subname);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to increment/decrement agent_count
CREATE OR REPLACE FUNCTION update_device_agent_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE devices 
        SET agent_count = agent_count + 1 
        WHERE wallet_address = NEW.device_address;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE devices 
        SET agent_count = agent_count - 1 
        WHERE wallet_address = OLD.device_address;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_device_agent_count
    AFTER INSERT OR DELETE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_device_agent_count(); 