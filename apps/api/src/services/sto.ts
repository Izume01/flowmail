import { getPrisma } from '@flowmail/db';

export async function getBestSendTime(recipientEmail: string, projectId: string): Promise<number> {
  try {
    const prisma = getPrisma();

    // Fetch historical open hours for this recipient
    const emailStats = await prisma.email.findMany({
      where: {
        toEmail: recipientEmail,
        projectId: projectId,
        opens: { gt: 0 },
        localOpenHour: { not: null }
      },
      select: {
        localOpenHour: true
      }
    });

    if (!emailStats || emailStats.length === 0) {
      return 10; // Default to 10 AM
    }

    // Simple mode calculation
    const hourCounts: Record<number, number> = {};
    emailStats.forEach(stat => {
      const hour = stat.localOpenHour!;
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let bestHour = 10;
    let maxCount = 0;
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestHour = parseInt(hour, 10);
      }
    }

    return bestHour;
  } catch (error) {
    console.error('Error in STO service:', error);
    return 10; // Fallback
  }
}
