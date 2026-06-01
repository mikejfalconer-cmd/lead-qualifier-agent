/**
 * Resend Configuration Script
 * Configures domain and email routing for Lead Qualifier Pro
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const WEBHOOK_URL = "https://lead-qualifier-agent-production-dabf.up.railway.app/api/email/receive";
const DOMAIN_NAME = "leadqualifierpro.resend.dev";

if (!RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY environment variable not set");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

async function configureDomain() {
  console.log("🔧 Configuring Resend Domain\n");
  console.log(`Domain: ${DOMAIN_NAME}`);
  console.log(`Webhook: ${WEBHOOK_URL}\n`);

  try {
    // Step 1: List existing domains
    console.log("📋 Checking existing domains...");
    const domainsResponse = await resend.domains.list();

    if (!domainsResponse.data) {
      console.error("❌ Failed to list domains");
      return;
    }

    const existingDomain = domainsResponse.data.find(
      (d: any) => d.name === DOMAIN_NAME
    );

    if (existingDomain) {
      console.log(`✅ Domain already exists: ${DOMAIN_NAME}`);
      console.log(`   Status: ${existingDomain.status}`);
      console.log(`   ID: ${existingDomain.id}\n`);
    } else {
      console.log("📝 Creating new domain...");

      // Step 2: Create domain
      const createResponse = await resend.domains.create({
        name: DOMAIN_NAME,
      });

      if (createResponse.error) {
        console.error(
          `❌ Failed to create domain: ${createResponse.error.message}`
        );
        return;
      }

      console.log(`✅ Domain created: ${DOMAIN_NAME}`);
      console.log(`   ID: ${createResponse.data?.id}`);
      console.log(`   Status: ${createResponse.data?.status}\n`);
    }

    // Step 3: Display configuration
    console.log("📧 Email Configuration:");
    console.log(`   Email Address: leads-{clientId}@${DOMAIN_NAME}`);
    console.log(`   Example: leads-1@${DOMAIN_NAME}`);
    console.log(`   Webhook URL: ${WEBHOOK_URL}\n`);

    // Step 4: Display next steps
    console.log("✅ Configuration Complete!\n");
    console.log("📝 Next Steps:");
    console.log("1. Resend domain is ready for email receiving");
    console.log(`2. Send test email to: leads-1@${DOMAIN_NAME}`);
    console.log("3. Verify webhook receives the email");
    console.log("4. Check server logs for verification code");
    console.log("5. Reply with verification code to complete setup\n");

    console.log("📚 Documentation:");
    console.log("   See RESEND_WEBHOOK_SETUP.md for complete instructions");
  } catch (error) {
    console.error("❌ Error:", (error as Error).message);
  }
}

configureDomain();
