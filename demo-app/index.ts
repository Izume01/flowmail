import { FlowMail } from "@flowmail/sdk";

async function main() {
  console.log("🚀 Starting FlowMail Demo App...");

  // Initialize SDK
  const flowmail = new FlowMail({
    apiKey: process.env.FLOWMAIL_API_KEY || "your_api_key_here",
    baseUrl: process.env.FLOWMAIL_API_URL || "http://localhost:3001",
  });

  const testEmail = "demo-user@example.com";

  // 1. Identify a user (CRM)
  console.log(`👤 Identifying user: ${testEmail}...`);
  await flowmail.identify({
    email: testEmail,
    first_name: "Demo",
    last_name: "User",
    attributes: {
      plan: "pro",
      industry: "SaaS",
      signup_source: "github_demo"
    }
  });

  // 2. Track an event (Triggering a Flow)
  console.log(`🎯 Tracking event: 'demo_started'...`);
  const trackRes = await flowmail.track({
    email: testEmail,
    event_name: "demo_started",
    properties: {
      source: "cli",
      timestamp: new Date().toISOString()
    }
  });
  console.log("✅ Event tracked. Response:", trackRes);

  // 3. Send a transactional email directly
  console.log(`✉️ Sending direct transactional email to ${testEmail}...`);
  const emailRes = await flowmail.sendEmail({
    from: "hello@yourdomain.com",
    to: testEmail,
    subject: "Welcome to the Demo!",
    html: "<h1>Welcome!</h1><p>Thanks for testing FlowMail.</p>"
  });
  console.log("✅ Email queued. Response:", emailRes);

  console.log("\n🎉 Demo finished! Check your FlowMail dashboard to see the results.");
}

main().catch(console.error);
