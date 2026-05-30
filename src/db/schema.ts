import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, decimal, boolean, index } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const clients = mysqlTable('clients', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  forwardingEmail: varchar('forwarding_email', { length: 320 }).notNull().unique(),
  subscriptionStatus: mysqlEnum('subscription_status', ['active', 'paused', 'cancelled']).default('active'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  monthlyBudget: decimal('monthly_budget', { precision: 10, scale: 2 }),
  apiKey: varchar('api_key', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  forwardingEmailIdx: index('forwarding_email_idx').on(table.forwardingEmail),
  stripeCustomerIdx: index('stripe_customer_idx').on(table.stripeCustomerId),
}));

export const leads = mysqlTable('leads', {
  id: int('id').autoincrement().primaryKey(),
  clientId: int('client_id').notNull(),
  senderEmail: varchar('sender_email', { length: 320 }).notNull(),
  senderName: varchar('sender_name', { length: 255 }),
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  score: int('score').default(0), // 0-100
  qualification: mysqlEnum('qualification', ['hot', 'warm', 'cold']).default('cold'),
  status: mysqlEnum('status', ['new', 'contacted', 'converted', 'lost']).default('new'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  clientIdIdx: index('client_id_idx').on(table.clientId),
  qualificationIdx: index('qualification_idx').on(table.qualification),
  statusIdx: index('status_idx').on(table.status),
}));

export const followUps = mysqlTable('follow_ups', {
  id: int('id').autoincrement().primaryKey(),
  leadId: int('lead_id').notNull(),
  clientId: int('client_id').notNull(),
  emailBody: text('email_body').notNull(),
  sentAt: timestamp('sent_at'),
  responseReceived: boolean('response_received').default(false),
  responseBody: text('response_body'),
  responseReceivedAt: timestamp('response_received_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  leadIdIdx: index('lead_id_idx').on(table.leadId),
  clientIdIdx: index('client_id_idx').on(table.clientId),
}));

export const emailLogs = mysqlTable('email_logs', {
  id: int('id').autoincrement().primaryKey(),
  clientId: int('client_id').notNull(),
  type: mysqlEnum('type', ['inbound', 'outbound']).notNull(),
  fromEmail: varchar('from_email', { length: 320 }).notNull(),
  toEmail: varchar('to_email', { length: 320 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  messageId: varchar('message_id', { length: 255 }),
  status: mysqlEnum('status', ['sent', 'failed', 'bounced']).default('sent'),
  errorMessage: text('error_message'),
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
  clientIdIdx: index('client_id_idx').on(table.clientId),
  typeIdx: index('type_idx').on(table.type),
}));

export const subscriptionPlans = mysqlTable('subscription_plans', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull().unique(),
  monthlyPrice: decimal('monthly_price', { precision: 10, scale: 2 }).notNull(),
  leadsPerMonth: int('leads_per_month'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  leads: many(leads),
  followUps: many(followUps),
  emailLogs: many(emailLogs),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  client: one(clients, {
    fields: [leads.clientId],
    references: [clients.id],
  }),
  followUps: many(followUps),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  lead: one(leads, {
    fields: [followUps.leadId],
    references: [leads.id],
  }),
  client: one(clients, {
    fields: [followUps.clientId],
    references: [clients.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  client: one(clients, {
    fields: [emailLogs.clientId],
    references: [clients.id],
  }),
}));

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = typeof followUps.$inferInsert;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
