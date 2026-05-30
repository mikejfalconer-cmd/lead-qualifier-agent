import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function runTests() {
  console.log('\n=== Lead Qualifier Pro E2E Test Suite ===\n');

  const sql = postgres(connectionString, {
    ssl: 'require',
  });

  try {
    // Test 1: Verify database connection
    console.log('✓ Test 1: Database Connection');
    const result = await sql`SELECT NOW() as current_time`;
    console.log(`  Connected to database at: ${result[0].current_time}`);

    // Test 2: Verify tables exist
    console.log('\n✓ Test 2: Database Tables');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log(`  Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`    - ${t.table_name}`));

    // Test 3: Create a test client
    console.log('\n✓ Test 3: Create Test Client');
    const testApiKey = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const clients = await sql`
      INSERT INTO clients (name, email, forwarding_email, api_key, subscription_status)
      VALUES ('Test Client', 'test@example.com', 'leads@test.example.com', ${testApiKey}, 'active')
      RETURNING id, name, email, api_key;
    `;
    
    const clientId = clients[0].id;
    console.log(`  Created client: ${clients[0].name} (ID: ${clientId})`);
    console.log(`  API Key: ${clients[0].api_key}`);

    // Test 4: Create a test lead
    console.log('\n✓ Test 4: Create Test Lead');
    const leads = await sql`
      INSERT INTO leads (
        client_id, 
        sender_email, 
        sender_name, 
        subject, 
        body, 
        score, 
        qualification, 
        status
      )
      VALUES (
        ${clientId},
        'prospect@company.com',
        'John Smith',
        'Interested in your services',
        'Hi, we are looking for a solution to automate our lead qualification process. Can you help?',
        85,
        'hot',
        'new'
      )
      RETURNING id, sender_email, qualification, score;
    `;
    
    const leadId = leads[0].id;
    console.log(`  Created lead: ${leads[0].sender_email}`);
    console.log(`  Qualification: ${leads[0].qualification} (Score: ${leads[0].score})`);

    // Test 5: Create a follow-up
    console.log('\n✓ Test 5: Create Follow-up');
    const followUps = await sql`
      INSERT INTO follow_ups (lead_id, client_id, email_body, sent_at)
      VALUES (
        ${leadId},
        ${clientId},
        'Hi John, Thank you for your interest. Let us discuss how we can help.',
        NOW()
      )
      RETURNING id, sent_at;
    `;
    
    console.log(`  Created follow-up (ID: ${followUps[0].id})`);
    console.log(`  Sent at: ${followUps[0].sent_at}`);

    // Test 6: Log an email
    console.log('\n✓ Test 6: Log Email');
    const emailLogs = await sql`
      INSERT INTO email_logs (
        client_id,
        type,
        from_email,
        to_email,
        subject,
        status
      )
      VALUES (
        ${clientId},
        'outbound',
        'test@example.com',
        'prospect@company.com',
        'Interested in your services',
        'sent'
      )
      RETURNING id, status, timestamp;
    `;
    
    console.log(`  Logged email (ID: ${emailLogs[0].id})`);
    console.log(`  Status: ${emailLogs[0].status}`);

    // Test 7: Query lead statistics
    console.log('\n✓ Test 7: Lead Statistics');
    const stats = await sql`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN qualification = 'hot' THEN 1 END) as hot_leads,
        COUNT(CASE WHEN qualification = 'warm' THEN 1 END) as warm_leads,
        COUNT(CASE WHEN qualification = 'cold' THEN 1 END) as cold_leads,
        AVG(score) as average_score
      FROM leads
      WHERE client_id = ${clientId};
    `;
    
    console.log(`  Total leads: ${stats[0].total_leads}`);
    console.log(`  Hot leads: ${stats[0].hot_leads}`);
    console.log(`  Warm leads: ${stats[0].warm_leads}`);
    console.log(`  Cold leads: ${stats[0].cold_leads}`);
    console.log(`  Average score: ${Math.round(stats[0].average_score)}`);

    // Test 8: Verify relationships
    console.log('\n✓ Test 8: Data Relationships');
    const leadWithClient = await sql`
      SELECT 
        l.id as lead_id,
        l.sender_email,
        c.name as client_name,
        c.api_key
      FROM leads l
      JOIN clients c ON l.client_id = c.id
      WHERE l.id = ${leadId};
    `;
    
    console.log(`  Lead ${leadWithClient[0].lead_id} belongs to client: ${leadWithClient[0].client_name}`);

    // Test 9: Update lead status
    console.log('\n✓ Test 9: Update Lead Status');
    const updated = await sql`
      UPDATE leads 
      SET status = 'contacted', notes = 'Follow-up sent'
      WHERE id = ${leadId}
      RETURNING id, status, notes;
    `;
    
    console.log(`  Updated lead status to: ${updated[0].status}`);
    console.log(`  Notes: ${updated[0].notes}`);

    // Test 10: Cleanup (optional)
    console.log('\n✓ Test 10: Cleanup Test Data');
    await sql`DELETE FROM follow_ups WHERE client_id = ${clientId}`;
    await sql`DELETE FROM leads WHERE client_id = ${clientId}`;
    await sql`DELETE FROM email_logs WHERE client_id = ${clientId}`;
    await sql`DELETE FROM clients WHERE id = ${clientId}`;
    console.log(`  Cleaned up test data for client ${clientId}`);

    console.log('\n=== All Tests Passed! ✓ ===\n');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error);
    await sql.end();
    process.exit(1);
  }
}

runTests();
