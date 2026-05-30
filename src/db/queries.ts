import { eq, and, desc } from 'drizzle-orm';
import { getDatabase } from './index';
import { 
  clients, 
  leads, 
  followUps, 
  emailLogs,
  InsertClient,
  InsertLead,
  InsertFollowUp,
  InsertEmailLog
} from './schema';

// ============ CLIENT QUERIES ============

export async function createClient(data: InsertClient) {
  const db = getDatabase();
  const result = await db.insert(clients).values(data).returning();
  return result[0];
}

export async function getClientByApiKey(apiKey: string) {
  const db = getDatabase();
  return await db.query.clients.findFirst({
    where: eq(clients.apiKey, apiKey),
  });
}

export async function getClientById(id: number) {
  const db = getDatabase();
  return await db.query.clients.findFirst({
    where: eq(clients.id, id),
  });
}

export async function getClientByForwardingEmail(forwardingEmail: string) {
  const db = getDatabase();
  return await db.query.clients.findFirst({
    where: eq(clients.forwardingEmail, forwardingEmail),
  });
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = getDatabase();
  await db.update(clients).set(data).where(eq(clients.id, id));
  return await getClientById(id);
}

// ============ LEAD QUERIES ============

export async function createLead(data: InsertLead) {
  const db = getDatabase();
  const result = await db.insert(leads).values(data).returning();
  return result[0];
}

export async function getLeadById(id: number) {
  const db = getDatabase();
  return await db.query.leads.findFirst({
    where: eq(leads.id, id),
    with: {
      followUps: true,
    },
  });
}

export async function getLeadsByClientId(clientId: number, filters?: {
  qualification?: string;
  status?: string;
}) {
  const db = getDatabase();
  const whereConditions = [eq(leads.clientId, clientId)];
  
  if (filters?.qualification) {
    whereConditions.push(eq(leads.qualification, filters.qualification as any));
  }
  if (filters?.status) {
    whereConditions.push(eq(leads.status, filters.status as any));
  }

  return await db.query.leads.findMany({
    where: and(...whereConditions),
    with: {
      followUps: true,
    },
    orderBy: desc(leads.createdAt),
  });
}

export async function updateLead(id: number, data: Partial<InsertLead>) {
  const db = getDatabase();
  await db.update(leads).set(data).where(eq(leads.id, id));
  return await getLeadById(id);
}

export async function getLeadStats(clientId: number) {
  const db = getDatabase();
  const clientLeads = await db.query.leads.findMany({
    where: eq(leads.clientId, clientId),
  });

  return {
    totalLeads: clientLeads.length,
    hotLeads: clientLeads.filter(l => l.qualification === 'hot').length,
    warmLeads: clientLeads.filter(l => l.qualification === 'warm').length,
    coldLeads: clientLeads.filter(l => l.qualification === 'cold').length,
    convertedLeads: clientLeads.filter(l => l.status === 'converted').length,
    contactedLeads: clientLeads.filter(l => l.status === 'contacted').length,
    lostLeads: clientLeads.filter(l => l.status === 'lost').length,
    averageScore: clientLeads.length > 0
      ? Math.round(clientLeads.reduce((sum, l) => sum + (l.score || 0), 0) / clientLeads.length)
      : 0,
  };
}

// ============ FOLLOW-UP QUERIES ============

export async function createFollowUp(data: InsertFollowUp) {
  const db = getDatabase();
  const result = await db.insert(followUps).values(data).returning();
  return result[0];
}

export async function getFollowUpsByLeadId(leadId: number) {
  const db = getDatabase();
  return await db.query.followUps.findMany({
    where: eq(followUps.leadId, leadId),
    orderBy: desc(followUps.createdAt),
  });
}

export async function updateFollowUp(id: number, data: Partial<InsertFollowUp>) {
  const db = getDatabase();
  await db.update(followUps).set(data).where(eq(followUps.id, id));
  return await db.query.followUps.findFirst({
    where: eq(followUps.id, id),
  });
}

// ============ EMAIL LOG QUERIES ============

export async function createEmailLog(data: InsertEmailLog) {
  const db = getDatabase();
  const result = await db.insert(emailLogs).values(data).returning();
  return result[0];
}

export async function getEmailLogsByClientId(clientId: number, type?: string) {
  const db = getDatabase();
  const whereConditions = [eq(emailLogs.clientId, clientId)];
  
  if (type) {
    whereConditions.push(eq(emailLogs.type, type as any));
  }

  return await db.query.emailLogs.findMany({
    where: and(...whereConditions),
    orderBy: desc(emailLogs.timestamp),
  });
}

export async function getRecentEmailLogs(clientId: number, limit: number = 50) {
  const db = getDatabase();
  return await db.query.emailLogs.findMany({
    where: eq(emailLogs.clientId, clientId),
    orderBy: desc(emailLogs.timestamp),
    limit,
  });
}
