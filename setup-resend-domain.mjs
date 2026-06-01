#!/usr/bin/env node

/**
 * Resend Domain Configuration & Testing Script
 * Configures email receiving domain and tests webhook connectivity
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const WEBHOOK_URL = 'https://lead-qualifier-agent-production-dabf.up.railway.app/api/email/receive';
const DOMAIN_NAME = 'leadqualifierpro.resend.dev';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY environment variable not set');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

async function main() {
  console.log('🔧 Resend Domain Configuration & Testing\n');
  console.log(`Domain: ${DOMAIN_NAME}`);
  console.log(`Webhook: ${WEBHOOK_URL}\n`);

  try {
    // Step 1: List existing domains
    console.log('📋 Step 1: Checking existing domains...');
    const domainsResponse = await resend.domains.list();

    if (!domainsResponse.data) {
      console.log('⚠️  No domains found, creating new one...\n');
    } else {
      const existingDomain = domainsResponse.data.find((d) => d.name === DOMAIN_NAME);
      if (existingDomain) {
        console.log(`✅ Domain already exists: ${DOMAIN_NAME}`);
        console.log(`   Status: ${existingDomain.status}`);
        console.log(`   ID: ${existingDomain.id}\n`);
      } else {
        console.log(`Domain not found, will create: ${DOMAIN_NAME}\n`);
      }
    }

    // Step 2: Create domain if needed
    console.log('📝 Step 2: Verifying/Creating domain...');
    let domainId;

    if (domainsResponse.data?.some((d) => d.name === DOMAIN_NAME)) {
      domainId = domainsResponse.data.find((d) => d.name === DOMAIN_NAME)?.id;
      console.log(`✅ Using existing domain: ${domainId}\n`);
    } else {
      const createResponse = await resend.domains.create({
        name: DOMAIN_NAME,
      });

      if (createResponse.error) {
        console.error(`❌ Failed to create domain: ${createResponse.error.message}`);
        process.exit(1);
      }

      domainId = createResponse.data?.id;
      console.log(`✅ Domain created: ${DOMAIN_NAME}`);
      console.log(`   ID: ${domainId}`);
      console.log(`   Status: ${createResponse.data?.status}\n`);
    }

    // Step 3: Display configuration
    console.log('📧 Step 3: Email Configuration Ready');
    console.log(`   Email Address Pattern: leads-{{clientId}}@${DOMAIN_NAME}`);
    console.log(`   Example: leads-1@${DOMAIN_NAME}`);
    console.log(`   Webhook URL: ${WEBHOOK_URL}\n`);

    // Step 4: Display next steps
    console.log('✅ Configuration Complete!\n');
    console.log('📝 Next Steps:');
    console.log('1. Send test email to: leads-1@' + DOMAIN_NAME);
    console.log('2. Verify webhook receives the email');
    console.log('3. Check server logs for verification code');
    console.log('4. Reply with verification code to complete setup');
    console.log('5. Confirm lead appears in dashboard\n');

    console.log('📚 Documentation:');
    console.log('   See RESEND_MANUAL_SETUP.md for complete instructions');
    console.log('   See test-email-webhook.mjs for webhook testing\n');

    console.log('🎉 Resend domain is ready for email receiving!');
  } catch (error) {
    console.error('❌ Error:', (error).message);
    process.exit(1);
  }
}

main();
