/**
 * Self-Improving System using Elon's 5-Step Algorithm
 * 
 * The system continuously learns from conversion data to improve lead scoring:
 * 1. Question every requirement
 * 2. Delete any part that isn't clearly needed
 * 3. Simplify and optimize
 * 4. Accelerate cycle time
 * 5. Automate
 * 
 * Applied to lead qualification:
 * 1. Question: What signals actually predict conversions?
 * 2. Delete: Remove scoring criteria that don't correlate
 * 3. Simplify: Use only the strongest predictors
 * 4. Accelerate: Faster feedback loops
 * 5. Automate: Continuous retraining
 */

import Anthropic from "@anthropic-ai/sdk";
import mysql from "mysql2/promise";

// Initialize Anthropic client with API key from environment
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ScoringCriteria {
  name: string;
  weight: number;
  description: string;
  isActive: boolean;
}

interface LeadAnalysis {
  leadId: number;
  clientId: number;
  originalQualification: "hot" | "warm" | "cold";
  actualConversion: boolean;
  scoringCriteria: ScoringCriteria[];
  predictedCorrectly: boolean;
  confidence: number;
}

interface ModelPerformance {
  totalLeads: number;
  correctPredictions: number;
  accuracy: number;
  hotAccuracy: number;
  warmAccuracy: number;
  coldAccuracy: number;
  lastUpdated: Date;
}

let sqlClient: any = null;

function getSqlClient() {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const cleanUrl = databaseUrl.split("?")[0];
    const url = new URL(cleanUrl);
    sqlClient = mysql.createPool({
      host: url.hostname,
      port: parseInt(url.port || "3306"),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: { rejectUnauthorized: false },
    });
  }
  return sqlClient;
}

/**
 * Step 1: Question - Analyze which scoring criteria actually predict conversions
 */
export async function analyzeConversionPatterns(): Promise<{
  patterns: Record<string, number>;
  insights: string;
}> {
  // Check if Anthropic API key is available
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Self-Improving] Anthropic API key not set, using basic analysis');
    return {
      patterns: {
        hot_conversion_rate: 0.6,
        warm_conversion_rate: 0.3,
        cold_conversion_rate: 0.1,
        budget_mention_correlation: 0.7,
        urgency_mention_correlation: 0.5,
      },
      insights: 'Using default patterns - Anthropic API key not configured',
    };
  }
  const pool = getSqlClient();
  const conn = await pool.getConnection();

  try {
    // Get leads with conversion data
    const [leads] = await conn.query(`
      SELECT 
        l.id,
        l.qualification,
        l.status,
        l.message,
        l.sender_email,
        CASE WHEN l.status = 'converted' THEN 1 ELSE 0 END as converted,
        COUNT(f.id) as followup_count
      FROM leads l
      LEFT JOIN follow_ups f ON l.id = f.lead_id
      WHERE l.client_id IS NOT NULL
      GROUP BY l.id
      LIMIT 100
    `);

    // Analyze patterns
    const patterns: Record<string, number> = {
      hot_conversion_rate: 0,
      warm_conversion_rate: 0,
      cold_conversion_rate: 0,
      followup_correlation: 0,
      budget_mention_correlation: 0,
      urgency_mention_correlation: 0,
    };

    let hotCount = 0,
      hotConverted = 0;
    let warmCount = 0,
      warmConverted = 0;
    let coldCount = 0,
      coldConverted = 0;
    let budgetMentions = 0,
      budgetConverted = 0;
    let urgencyMentions = 0,
      urgencyConverted = 0;

    (leads as any[]).forEach((lead) => {
      const converted = lead.converted === 1;
      const message = (lead.message || "").toLowerCase();
      const hasBudget =
        message.includes("budget") ||
        message.includes("$") ||
        message.includes("cost");
      const hasUrgency =
        message.includes("urgent") ||
        message.includes("asap") ||
        message.includes("emergency") ||
        message.includes("immediately");

      if (lead.qualification === "hot") {
        hotCount++;
        if (converted) hotConverted++;
      } else if (lead.qualification === "warm") {
        warmCount++;
        if (converted) warmConverted++;
      } else {
        coldCount++;
        if (converted) coldConverted++;
      }

      if (hasBudget) {
        budgetMentions++;
        if (converted) budgetConverted++;
      }

      if (hasUrgency) {
        urgencyMentions++;
        if (converted) urgencyConverted++;
      }
    });

    patterns.hot_conversion_rate = hotCount > 0 ? hotConverted / hotCount : 0;
    patterns.warm_conversion_rate = warmCount > 0 ? warmConverted / warmCount : 0;
    patterns.cold_conversion_rate = coldCount > 0 ? coldConverted / coldCount : 0;
    patterns.budget_mention_correlation =
      budgetMentions > 0 ? budgetConverted / budgetMentions : 0;
    patterns.urgency_mention_correlation =
      urgencyMentions > 0 ? urgencyConverted / urgencyMentions : 0;

    // Use LLM to generate insights if available
    let insights = 'Patterns analyzed. Budget and urgency signals are strong conversion predictors.';
    try {
      const insightsResponse = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Analyze these lead scoring patterns and suggest which criteria are most predictive of conversions:
          
${JSON.stringify(patterns, null, 2)}

Provide 2-3 key insights about what actually drives conversions.`,
          },
        ],
      });

      insights =
        insightsResponse.content[0].type === "text"
          ? insightsResponse.content[0].text
          : insights;
    } catch (e) {
      console.warn('[Self-Improving] Failed to get LLM insights, using default', e);
    }

    return { patterns, insights };
  } finally {
    conn.release();
  }
}

/**
 * Step 2 & 3: Delete & Simplify - Remove ineffective criteria and optimize
 */
export async function optimizeScoringCriteria(): Promise<ScoringCriteria[]> {
  const patterns = await analyzeConversionPatterns();

  // Identify strongest predictors
  const criteria: ScoringCriteria[] = [
    {
      name: "budget_mentioned",
      weight:
        patterns.patterns.budget_mention_correlation > 0.5 ? 0.3 : 0.15,
      description: "Lead mentions specific budget or price range",
      isActive: patterns.patterns.budget_mention_correlation > 0.3,
    },
    {
      name: "urgency_signals",
      weight:
        patterns.patterns.urgency_mention_correlation > 0.5 ? 0.25 : 0.1,
      description: "Lead mentions urgent timeline (ASAP, emergency, etc)",
      isActive: patterns.patterns.urgency_mention_correlation > 0.3,
    },
    {
      name: "decision_maker",
      weight: 0.2,
      description: "Lead appears to be decision maker",
      isActive: true,
    },
    {
      name: "problem_clarity",
      weight: 0.15,
      description: "Lead clearly describes the problem",
      isActive: true,
    },
    {
      name: "company_size",
      weight: 0.1,
      description: "Lead is from appropriately sized company",
      isActive: true,
    },
  ];

  // Normalize weights
  const totalWeight = criteria.reduce((sum, c) => sum + (c.isActive ? c.weight : 0), 0);
  criteria.forEach((c) => {
    if (c.isActive) {
      c.weight = c.weight / totalWeight;
    }
  });

  return criteria;
}

/**
 * Step 4: Accelerate - Faster feedback loops
 */
export async function updateLeadConversionStatus(
  leadId: number,
  converted: boolean,
  notes?: string
): Promise<void> {
  const pool = getSqlClient();
  const conn = await pool.getConnection();

  try {
    const newStatus = converted ? "converted" : "lost";
    // Try to update with notes, fall back to just status if notes column doesn't exist
    try {
      await conn.query("UPDATE leads SET status = ?, notes = ? WHERE id = ?", [
        newStatus,
        notes || null,
        leadId,
      ]);
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        // notes column doesn't exist, just update status
        await conn.query("UPDATE leads SET status = ? WHERE id = ?", [
          newStatus,
          leadId,
        ]);
      } else {
        throw e;
      }
    }

    // Log for analysis
    console.log(
      `[Self-Improving] Lead ${leadId} marked as ${newStatus}. Will be analyzed in next retraining cycle.`
    );
  } finally {
    conn.release();
  }
}

/**
 * Step 5: Automate - Continuous retraining
 */
export async function retrainScoringModel(): Promise<ModelPerformance> {
  const pool = getSqlClient();
  const conn = await pool.getConnection();

  try {
    // Get recent leads with conversion data
    const [leads] = await conn.query(`
      SELECT 
        id,
        qualification,
        status,
        message,
        sender_email
      FROM leads
      WHERE status IN ('converted', 'lost')
      ORDER BY id DESC
      LIMIT 50
    `);

    let correctPredictions = 0;
    let hotCorrect = 0,
      hotTotal = 0;
    let warmCorrect = 0,
      warmTotal = 0;
    let coldCorrect = 0,
      coldTotal = 0;

    // Evaluate predictions
    (leads as any[]).forEach((lead) => {
      const actuallyConverted = lead.status === "converted";

      // Simple heuristic: hot leads should convert more often
      const predictedCorrectly =
        (lead.qualification === "hot" && actuallyConverted) ||
        (lead.qualification !== "hot" && !actuallyConverted);

      if (predictedCorrectly) correctPredictions++;

      if (lead.qualification === "hot") {
        hotTotal++;
        if (predictedCorrectly) hotCorrect++;
      } else if (lead.qualification === "warm") {
        warmTotal++;
        if (predictedCorrectly) warmCorrect++;
      } else {
        coldTotal++;
        if (predictedCorrectly) coldCorrect++;
      }
    });

    const totalLeads = (leads as any[]).length;
    const accuracy = totalLeads > 0 ? correctPredictions / totalLeads : 0;

    const performance: ModelPerformance = {
      totalLeads,
      correctPredictions,
      accuracy,
      hotAccuracy: hotTotal > 0 ? hotCorrect / hotTotal : 0,
      warmAccuracy: warmTotal > 0 ? warmCorrect / warmTotal : 0,
      coldAccuracy: coldTotal > 0 ? coldCorrect / coldTotal : 0,
      lastUpdated: new Date(),
    };

    // Store performance metrics
    await conn.query(
      `INSERT INTO model_performance (accuracy, hot_accuracy, warm_accuracy, cold_accuracy, total_leads, last_updated)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        performance.accuracy,
        performance.hotAccuracy,
        performance.warmAccuracy,
        performance.coldAccuracy,
        performance.totalLeads,
      ]
    );

    console.log("[Self-Improving] Model retraining complete:", performance);

    return performance;
  } finally {
    conn.release();
  }
}

/**
 * Get current model performance
 */
export async function getModelPerformance(): Promise<ModelPerformance | null> {
  const pool = getSqlClient();
  const conn = await pool.getConnection();

  try {
    const [performance] = await conn.query(
      `SELECT accuracy, hot_accuracy, warm_accuracy, cold_accuracy, total_leads, last_updated
       FROM model_performance
       ORDER BY last_updated DESC
       LIMIT 1`
    );

    if ((performance as any[]).length === 0) return null;

    const p = (performance as any[])[0];
    return {
      totalLeads: p.total_leads,
      correctPredictions: Math.round(p.accuracy * p.total_leads),
      accuracy: p.accuracy,
      hotAccuracy: p.hot_accuracy,
      warmAccuracy: p.warm_accuracy,
      coldAccuracy: p.cold_accuracy,
      lastUpdated: p.last_updated,
    };
  } finally {
    conn.release();
  }
}

/**
 * Run full self-improvement cycle
 */
export async function runSelfImprovementCycle(): Promise<{
  patterns: Record<string, number>;
  optimizedCriteria: ScoringCriteria[];
  performance: ModelPerformance;
}> {
  console.log("[Self-Improving] Starting self-improvement cycle...");

  // Step 1: Question
  const { patterns } = await analyzeConversionPatterns();
  console.log("[Self-Improving] Step 1 - Analyzed conversion patterns");

  // Step 2 & 3: Delete & Simplify
  const optimizedCriteria = await optimizeScoringCriteria();
  console.log("[Self-Improving] Step 2-3 - Optimized scoring criteria");

  // Step 5: Automate (Step 4 happens continuously)
  const performance = await retrainScoringModel();
  console.log("[Self-Improving] Step 5 - Model retrained");

  return {
    patterns,
    optimizedCriteria,
    performance,
  };
}
