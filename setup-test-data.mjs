import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function setupTestData() {
  try {
    console.log('Setting up test data...');
    
    // Generate a webhook token
    const webhookToken = 'wh_' + Math.random().toString(16).slice(2).padEnd(32, '0');
    
    // Check if test client already exists
    const existing = await sql`
      SELECT id FROM clients WHERE email = 'test@example.com' LIMIT 1
    `;
    
    let clientId;
    
    if (existing && existing.length > 0) {
      clientId = existing[0].id;
      console.log('Test client already exists:', clientId);
      
      // Update webhook token
      await sql`
        UPDATE clients SET webhook_token = ${webhookToken} WHERE id = ${clientId}
      `;
      console.log('Updated webhook token:', webhookToken);
    } else {
      // Create new test client
      const result = await sql`
        INSERT INTO clients (name, email, webhook_token, subscription_status)
        VALUES ('Test Client', 'test@example.com', ${webhookToken}, 'active')
        RETURNING id
      `;
      clientId = result[0].id;
      console.log('Created test client:', clientId);
      console.log('Webhook token:', webhookToken);
    }
    
    console.log('\n✅ Test data setup complete!');
    console.log('Client ID:', clientId);
    console.log('Webhook Token:', webhookToken);
    console.log('Webhook URL: http://localhost:3000/api/webhooks/' + webhookToken);
    
    await sql.end();
  } catch (error) {
    console.error('Error setting up test data:', error);
    process.exit(1);
  }
}

setupTestData();
