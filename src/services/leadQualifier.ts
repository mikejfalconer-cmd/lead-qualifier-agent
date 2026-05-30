import Anthropic from "@anthropic-ai/sdk";

interface LeadData {
  senderEmail: string;
  senderName?: string;
  subject: string;
  body: string;
}

interface QualificationResult {
  score: number; // 0-100
  qualification: "hot" | "warm" | "cold";
  reasoning: string;
  problemIdentified: string;
  solutionFit: string;
  budgetIndicators: string;
  timeline: string;
  decisionMaker: string;
  followUpSuggestion: string;
}

const client = new Anthropic();

export async function qualifyLead(lead: LeadData): Promise<QualificationResult> {
  const prompt = `You are an expert sales lead qualifier. Analyze this inbound lead using Elon Musk's 5-step algorithm and provide a qualification score.

LEAD INFORMATION:
From: ${lead.senderName || "Unknown"} (${lead.senderEmail})
Subject: ${lead.subject}
Message: ${lead.body}

Apply the 5-step algorithm:
1. QUESTION THE REQUIREMENT - Is this a real opportunity? Is the need genuine?
2. DELETE THE REQUIREMENT - Is this essential? Can we eliminate unnecessary steps?
3. SIMPLIFY AND OPTIMIZE - Can we improve the process? Is there a better approach?
4. ACCELERATE CYCLE TIME - Can we speed up the sales cycle? What's the urgency?
5. AUTOMATE - Can we automate parts of the solution? Is this scalable?

Respond in JSON format:
{
  "score": <0-100>,
  "qualification": "<hot|warm|cold>",
  "reasoning": "<brief overall assessment>",
  "problemIdentified": "<what problem they have>",
  "solutionFit": "<how well we solve it>",
  "budgetIndicators": "<signals about budget>",
  "timeline": "<urgency and timeline>",
  "decisionMaker": "<decision maker assessment>",
  "followUpSuggestion": "<suggested follow-up approach>"
}

SCORING GUIDE:
- 80-100: Hot (high intent, clear need, budget signals, short timeline, decision-maker)
- 50-79: Warm (some indicators present, potential fit, needs nurturing)
- 0-49: Cold (low signals, generic inquiry, long-term prospect)

Be thorough in your analysis.`;

  try {
    console.log("[LeadQualifier] Analyzing lead from:", lead.senderEmail);

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const result = JSON.parse(jsonMatch[0]) as QualificationResult;

    console.log(
      `[LeadQualifier] Lead qualified: ${result.qualification} (score: ${result.score})`
    );

    return {
      score: Math.min(100, Math.max(0, result.score)),
      qualification: result.qualification,
      reasoning: result.reasoning,
      problemIdentified: result.problemIdentified,
      solutionFit: result.solutionFit,
      budgetIndicators: result.budgetIndicators,
      timeline: result.timeline,
      decisionMaker: result.decisionMaker,
      followUpSuggestion: result.followUpSuggestion,
    };
  } catch (error) {
    console.error("[LeadQualifier] Error qualifying lead:", error);
    // Return a default cold lead on error
    return {
      score: 0,
      qualification: "cold",
      reasoning: "Error during qualification",
      problemIdentified: "Unknown",
      solutionFit: "Unknown",
      budgetIndicators: "Unknown",
      timeline: "Unknown",
      decisionMaker: "Unknown",
      followUpSuggestion: "Manual review recommended",
    };
  }
}

export async function generateFollowUp(
  lead: LeadData,
  qualification: QualificationResult
): Promise<string> {
  try {
    const followUpPrompt = `Based on the following lead information and qualification, generate a professional follow-up email.

Lead Information:
- From: ${lead.senderEmail}
- Name: ${lead.senderName || "Prospect"}
- Subject: ${lead.subject}
- Original Message: ${lead.body}

Qualification Result:
- Score: ${qualification.score}/100
- Type: ${qualification.qualification}
- Problem: ${qualification.problemIdentified}
- Timeline: ${qualification.timeline}

Generate a professional follow-up email that:
1. Acknowledges their specific inquiry
2. Demonstrates understanding of their problem
3. Provides immediate value
4. Includes a clear, specific call-to-action
5. Is personalized and not generic

Keep it concise (under 200 words) and professional.`;

    console.log("[LeadQualifier] Generating follow-up for:", lead.senderEmail);

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: followUpPrompt,
        },
      ],
    });

    const followUpText =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log("[LeadQualifier] Follow-up generated successfully");

    return followUpText;
  } catch (error) {
    console.error("[LeadQualifier] Error generating follow-up:", error);
    throw error;
  }
}

export function getQualificationColor(qualification: string): string {
  switch (qualification) {
    case "hot":
      return "#ef4444"; // red
    case "warm":
      return "#f97316"; // orange
    case "cold":
      return "#6b7280"; // gray
    default:
      return "#9ca3af";
  }
}

export function getQualificationLabel(qualification: string): string {
  switch (qualification) {
    case "hot":
      return "🔥 Hot Lead";
    case "warm":
      return "🌤️ Warm Lead";
    case "cold":
      return "❄️ Cold Lead";
    default:
      return "Unknown";
  }
}
