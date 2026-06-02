import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL not set');
}

const url = new URL(databaseUrl);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
});

try {
  console.log('Creating test client...');
  
  const webhookToken = 'wh_test_' + Math.random().toString(36).substring(2, 15);
  
  const [result] = await connection.execute(
    `INSERT INTO clients (name, email, webhook_token, subscription_status) 
     VALUES (?, ?, ?, ?)`,
    ['Test Roofing Co', 'test@roofing.com', webhookToken, 'active']
  );
  
  console.log('✅ Test client created!');
  console.log('Client ID:', result.insertId);
  console.log('Webhook Token:', webhookToken);
  console.log('\nWebhook URL: http://localhost:3000/api/webhooks/' + webhookToken);
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
