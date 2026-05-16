import { createDbClient } from "@flowmail/db";
import * as fs from "fs";
import * as path from "path";

async function exportLogs() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Make sure they are set in your environment.");
    process.exit(1);
  }

  const db = createDbClient(supabaseUrl, supabaseKey);

  console.log("Fetching engagement logs from Supabase...");
  // We fetch emails that have been opened (local_open_hour is set)
  // to understand when users are active.
  const { data, error } = await db
    .from("emails")
    .select("id, project_id, to_email, local_open_hour, opens, created_at")
    .not("local_open_hour", "is", null);

  if (error) {
    console.error("Error fetching logs:", error);
    process.exit(1);
  }

  const exportPath = path.join(process.cwd(), "engagement_logs_export.json");
  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
  console.log(`Successfully exported ${data?.length || 0} logs to ${exportPath}`);
}

exportLogs().catch(console.error);
