import Anthropic from "@anthropic-ai/sdk";

interface QualificationResult {
  score: number; // 0-100
  qualification: "hot" | "warm" | "cold";
  reasoning: string;
  problemIdentified: string;
  solutionFit: string;
  budgetIndicators: string;
  timeline: string;
  decisionMaker: string;
}

const client = new Anthropic();

export async function qualifyLead(
  senderEmail: string,
  senderName: string,
  subject: string,
  body: string,
  clientBusiness: string
): Promise<QualificationResult> {
  const prompt = `You are an expert sales lead qualifier. Analyze this inbound lead using Elon Musk's 5-step algorithm and provide a qualification score.

LEAD INFORMATION:
From: ${senderName} (${senderEmail})
Subject: ${subject}
Message: ${body}

CLIENT BUSINESS: ${clientBusiness}

Apply the 5-step algorithm:
1. PROBLEM IDENTIFICATION - What problem is the prospect facing?
2. SOLUTION FIT - How well does our service solve their problem?
3. BUDGET INDICATORS - What signals indicate budget availability?
4. TIMELINE - When do they need a solution?
5. DECISION-MAKER - Are they the decision maker?

Respond in JSON format:
{
  "score": <0-100>,
  "qualification": "<hot|warm|cold>",
  "reasoning": "<brief overall assessment>",
  "problemIdentified": "<what problem they have>",
  "solutionFit": "<how well we solve it>",
  "budgetIndicators": "<signals about budget>",
  "timeline": "<urgency and timeline>",
  "decisionMaker": "<decision maker assessment>"
}

SCORING GUIDE:
- 80-100: Hot (high intent, clear need, budget, timeline, decision-maker)
- 50-79: Warm (some indicators present, needs nurturing)
- 0-49: Cold (low signals, long-term prospect)`;

  try {
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

    return {
      score: Math.min(100, Math.max(0, result.score)),
      qualification: result.qualification,
      reasoning: result.reasoning,
      problemIdentified: result.problemIdentified,
      solutionFit: result.solutionFit,
      budgetIndicators: result.budgetIndicators,
      timeline: result.timeline,
      decisionMaker: result.decisionMaker,
    };
  } catch (error) {
    console.error("Lead qualification error:", error);
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
    };
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
