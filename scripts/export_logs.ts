import { getPrisma } from "@flowmail/db";
import * as fs from "fs";
import * as path from "path";

async function exportLogs() {
  const prisma = getPrisma();

  console.log("Fetching engagement logs from Neon/Prisma...");
  
  try {
    const data = await prisma.email.findMany({
      where: {
        localOpenHour: { not: null }
      },
      select: {
        id: true,
        projectId: true,
        toEmail: true,
        localOpenHour: true,
        opens: true,
        createdAt: true
      }
    });

    const exportPath = path.join(process.cwd(), "engagement_logs_export.json");
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
    console.log(`Successfully exported ${data?.length || 0} logs to ${exportPath}`);
  } catch (error) {
    console.error("Error fetching logs:", error);
    process.exit(1);
  }
}

exportLogs().catch(console.error);
