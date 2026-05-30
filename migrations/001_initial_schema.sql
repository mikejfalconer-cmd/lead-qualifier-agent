-- Create enums
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled');
CREATE TYPE qualification AS ENUM ('hot', 'warm', 'cold');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'converted', 'lost');
CREATE TYPE email_type AS ENUM ('inbound', 'outbound');
CREATE TYPE email_status AS ENUM ('sent', 'failed', 'bounced');

-- Create clients table
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  forwarding_email VARCHAR(320) NOT NULL UNIQUE,
  subscription_status subscription_status DEFAULT 'active',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  monthly_budget NUMERIC(10, 2),
  api_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX forwarding_email_idx ON clients(forwarding_email);
CREATE INDEX stripe_customer_idx ON clients(stripe_customer_id);

-- Create leads table
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_email VARCHAR(320) NOT NULL,
  sender_name VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  qualification qualification DEFAULT 'cold',
  status lead_status DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX leads_client_id_idx ON leads(client_id);
CREATE INDEX leads_qualification_idx ON leads(qualification);
CREATE INDEX leads_status_idx ON leads(status);

-- Create follow_ups table
CREATE TABLE follow_ups (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email_body TEXT NOT NULL,
  sent_at TIMESTAMP,
  response_received BOOLEAN DEFAULT FALSE,
  response_body TEXT,
  response_received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX follow_ups_lead_id_idx ON follow_ups(lead_id);
CREATE INDEX follow_ups_client_id_idx ON follow_ups(client_id);

-- Create email_logs table
CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type email_type NOT NULL,
  from_email VARCHAR(320) NOT NULL,
  to_email VARCHAR(320) NOT NULL,
  subject VARCHAR(500),
  message_id VARCHAR(255),
  status email_status DEFAULT 'sent',
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX email_logs_client_id_idx ON email_logs(client_id);
CREATE INDEX email_logs_type_idx ON email_logs(type);

-- Create subscription_plans table
CREATE TABLE subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL UNIQUE,
  monthly_price NUMERIC(10, 2) NOT NULL,
  leads_per_month INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
