#!/usr/bin/env node

/**
 * Setup Test Client Script
 * Creates a test client with demo data for end-to-end testing
 */

import postgres from 'postgres';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

async function setupTestClient() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    console.log('🚀 Setting up test client...\n');

    // Generate API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    const forwardingEmail = `leads-1@leadqualifierpro.com`;

    // Create test client
    console.log('📝 Creating test client...');
    const result = await sql`
      INSERT INTO clients (
        name,
        email,
        forwarding_email,
        subscription_status,
        api_key,
        created_at,
        updated_at
      ) VALUES (
        'Test Client',
        'test@example.com',
        ${forwardingEmail},
        'active',
        ${apiKey},
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        api_key = ${apiKey},
        updated_at = NOW()
      RETURNING id, name, email, forwarding_email, api_key, subscription_status, created_at
    `;

    const client = result[0];

    console.log('✅ Test client created successfully!\n');
    console.log('📊 Client Details:');
    console.log(`   ID: ${client.id}`);
    console.log(`   Name: ${client.name}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   Forwarding Email: ${client.forwarding_email}`);
    console.log(`   API Key: ${client.api_key}`);
    console.log(`   Status: ${client.subscription_status}`);
    console.log(`   Created: ${client.created_at}\n`);

    // Create demo leads
    console.log('📧 Creating demo leads...');
    const demoLeads = [
      {
        name: 'John Smith',
        company: 'Acme Corporation',
        email: 'john@acme.com',
        subject: 'Interested in Lead Qualifier Pro',
        body: 'Hi, I saw your service and would like to learn more about how it can help our sales team.',
      },
      {
        name: 'Sarah Johnson',
        company: 'Tech Innovations Inc',
        email: 'sarah@techinnovations.com',
        subject: 'Partnership Opportunity',
        body: 'We are interested in integrating your lead qualification system into our CRM platform.',
      },
      {
        name: 'Mike Davis',
        company: 'Global Solutions Ltd',
        email: 'mike@globalsolutions.com',
        subject: 'Demo Request',
        body: 'Can we schedule a demo of your platform? We manage 500+ leads per month.',
      },
    ];

    for (const lead of demoLeads) {
      const leadResult = await sql`
        INSERT INTO leads (
          client_id,
          sender_email,
          sender_name,
          subject,
          body,
          qualification,
          status,
          score,
          created_at,
          updated_at
        ) VALUES (
          ${client.id},
          ${lead.email},
          ${lead.name},
          ${lead.subject},
          ${lead.body},
          'warm',
          'new',
          75,
          NOW(),
          NOW()
        )
        RETURNING id, sender_name, sender_email, subject, qualification, score
      `;

      const createdLead = leadResult[0];
      console.log(`   ✓ ${createdLead.sender_name} (${createdLead.qualification}) - Score: ${createdLead.score}`);
    }

    console.log('\n✅ Demo leads created successfully!\n');

    // Create demo email logs
    console.log('📋 Creating email logs...');
    for (const lead of demoLeads) {
      await sql`
        INSERT INTO email_logs (
          client_id,
          type,
          from_email,
          to_email,
          subject,
          status,
          timestamp
        ) VALUES (
          ${client.id},
          'inbound',
          ${lead.email},
          ${forwardingEmail},
          ${lead.subject},
          'sent',
          NOW()
        )
      `;
    }

    console.log('   ✓ Email logs created\n');

    // Print instructions
    console.log('🎯 Next Steps:\n');
    console.log('1. Use this API key to test the API:');
    console.log(`   curl -H "X-API-Key: ${apiKey}" https://lead-qualifier-agent-production-dabf.up.railway.app/api/clients/me\n`);

    console.log('2. Get email address for forwarding:');
    console.log(`   curl https://lead-qualifier-agent-production-dabf.up.railway.app/api/email/address/1\n`);

    console.log('3. Get leads:');
    console.log(`   curl -H "X-API-Key: ${apiKey}" https://lead-qualifier-agent-production-dabf.up.railway.app/api/leads\n`);

    console.log('4. Get analytics:');
    console.log(`   curl -H "X-API-Key: ${apiKey}" https://lead-qualifier-agent-production-dabf.up.railway.app/api/analytics/summary\n`);

    console.log('5. Test email receiving:');
    console.log(`   curl -X POST https://lead-qualifier-agent-production-dabf.up.railway.app/api/email/receive \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{'`);
    console.log(`       "from": "prospect@company.com",`);
    console.log(`       "to": "${forwardingEmail}",`);
    console.log(`       "subject": "New Lead",`);
    console.log(`       "text": "Name: Jane Doe\\nCompany: Example Corp"`);
    console.log(`     }'`);
    console.log(`\n`);

    console.log('✨ Test client setup complete! Ready for end-to-end testing.\n');

    await sql.end();
  } catch (error) {
    console.error('❌ Error setting up test client:', error);
    process.exit(1);
  }
}

setupTestClient();
