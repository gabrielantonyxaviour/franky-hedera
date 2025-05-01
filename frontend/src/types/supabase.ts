export type Device = {
  id: string
  device_model: string
  ram: string
  storage: string
  cpu: string | null
  ngrok_url: string
  wallet_address: string
  hosting_fee: string
  agent_count: number
  status: 'Active' | 'Inactive'
  last_active: string
  tx_hash: string
  registered_at: string
  created_at: string
  updated_at: string
}

export type Agent = {
  id: string
  name: string
  subname: string
  description: string | null
  personality: string | null
  scenario: string | null
  first_mes: string | null
  mes_example: string | null
  creator_comment: string | null
  tags: string[]
  talkativeness: number | null
  is_favorite: boolean
  device_address: string
  owner_address: string
  per_api_call_fee: string
  is_public: boolean
  tools: string[]
  metadata_url: string
  tx_hash: string
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      devices: {
        Row: Device
        Insert: Omit<Device, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Device, 'id'>>
      }
      agents: {
        Row: Agent
        Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Agent, 'id'>>
      }
    }
  }
} 