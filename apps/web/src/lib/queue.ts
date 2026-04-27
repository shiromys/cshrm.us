import PgBoss from "pg-boss";

// pg-boss requires a direct (unpooled) connection — pooled URLs break LISTEN/NOTIFY
const connectionString =
  process.env.POSTGRES_URL_UNPOOLED ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  "";

// Singleton pattern to avoid multiple boss instances
const globalForBoss = globalThis as unknown as { _boss?: PgBoss };

let bossPromise: Promise<PgBoss>;

export async function getBoss(): Promise<PgBoss> {
  if (globalForBoss._boss) return globalForBoss._boss;

  if (!bossPromise) {
    const boss = new PgBoss(connectionString);
    bossPromise = boss.start().then(async () => {
      // pg-boss v10 requires queues to be explicitly created before insert/fetch work
      await boss.createQueue(QUEUE_NAMES.CAMPAIGN_EMAIL);
      await boss.createQueue(QUEUE_NAMES.HOTLIST_EMAIL);
      globalForBoss._boss = boss;
      return boss;
    });
  }

  return bossPromise;
}

export const QUEUE_NAMES = {
  CAMPAIGN_EMAIL: "campaign-email",
  HOTLIST_EMAIL: "hotlist-email",
} as const;

export interface CampaignEmailJob {
  emailLogId: string;
  campaignId: string;
  userId: string;
  recipientEmail: string;
  recipientName: string;
  fromName: string;
  replyToEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  unsubscribeToken: string;
  openTrackingToken: string;
}

export async function enqueueCampaignEmails(jobs: CampaignEmailJob[]) {
  const boss = await getBoss();
  // Use send() per job — more reliable than insert() in pg-boss v10
  for (const data of jobs) {
    await boss.send(QUEUE_NAMES.CAMPAIGN_EMAIL, data, {
      retryLimit: 3,
      retryDelay: 30,
      expireInHours: 24,
    });
  }
}
