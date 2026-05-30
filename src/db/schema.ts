import { pgTable, serial, varchar, text, timestamp, pgEnum, numeric, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'paused', 'cancelled']);
export const qualificationEnum = pgEnum('qualification', ['hot', 'warm', 'cold']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'converted', 'lost']);
export const emailTypeEnum = pgEnum('email_type', ['inbound', 'outbound']);
export const emailStatusEnum = pgEnum('email_status', ['sent', 'failed', 'bounced']);

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  forwardingEmail: varchar('forwarding_email', { length: 320 }).notNull().unique(),
  subscriptionStatus: subscriptionStatusEnum('subscription_status').default('active'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  monthlyBudget: numeric('monthly_budget', { precision: 10, scale: 2 }),
  apiKey: varchar('api_key', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  forwardingEmailIdx: index('forwarding_email_idx').on(table.forwardingEmail),
  stripeCustomerIdx: index('stripe_customer_idx').on(table.stripeCustomerId),
}));

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  clientId: serial('client_id').notNull(),
  senderEmail: varchar('sender_email', { length: 320 }).notNull(),
  senderName: varchar('sender_name', { length: 255 }),
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  score: serial('score').default(0), // 0-100
  qualification: qualificationEnum('qualification').default('cold'),
  status: leadStatusEnum('status').default('new'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  clientIdIdx: index('leads_client_id_idx').on(table.clientId),
  qualificationIdx: index('leads_qualification_idx').on(table.qualification),
  statusIdx: index('leads_status_idx').on(table.status),
}));

export const followUps = pgTable('follow_ups', {
  id: serial('id').primaryKey(),
  leadId: serial('lead_id').notNull(),
  clientId: serial('client_id').notNull(),
  emailBody: text('email_body').notNull(),
  sentAt: timestamp('sent_at'),
  responseReceived: boolean('response_received').default(false),
  responseBody: text('response_body'),
  responseReceivedAt: timestamp('response_received_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  leadIdIdx: index('follow_ups_lead_id_idx').on(table.leadId),
  clientIdIdx: index('follow_ups_client_id_idx').on(table.clientId),
}));

export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  clientId: serial('client_id').notNull(),
  type: emailTypeEnum('type').notNull(),
  fromEmail: varchar('from_email', { length: 320 }).notNull(),
  toEmail: varchar('to_email', { length: 320 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  messageId: varchar('message_id', { length: 255 }),
  status: emailStatusEnum('status').default('sent'),
  errorMessage: text('error_message'),
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
  clientIdIdx: index('email_logs_client_id_idx').on(table.clientId),
  typeIdx: index('email_logs_type_idx').on(table.type),
}));

export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull().unique(),
  monthlyPrice: numeric('monthly_price', { precision: 10, scale: 2 }).notNull(),
  leadsPerMonth: serial('leads_per_month'),
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
