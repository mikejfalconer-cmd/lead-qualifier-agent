import Anthropic from "@anthropic-ai/sdk";

interface FollowUpEmailRequest {
  senderName: string;
  senderEmail: string;
  leadSubject: string;
  leadBody: string;
  qualification: "hot" | "warm" | "cold";
  clientName: string;
  clientBusiness: string;
  clientEmail: string;
  mikeSignature?: string;
}

interface FollowUpEmailResult {
  subject: string;
  body: string;
}

const client = new Anthropic();

export async function generateFollowUpEmail(
  request: FollowUpEmailRequest
): Promise<FollowUpEmailResult> {
  const urgencyTone =
    request.qualification === "hot"
      ? "urgent and action-oriented"
      : request.qualification === "warm"
        ? "friendly and consultative"
        : "informative and educational";

  const prompt = `You are an expert sales email writer. Generate a personalized follow-up email for a lead.

LEAD DETAILS:
Name: ${request.senderName}
Email: ${request.senderEmail}
Original Subject: ${request.leadSubject}
Original Message: ${request.leadBody}
Lead Quality: ${request.qualification}

CLIENT (WHO IS SENDING THE FOLLOW-UP):
Name: ${request.clientName}
Business: ${request.clientBusiness}
Email: ${request.clientEmail}

REQUIREMENTS:
- Tone: ${urgencyTone}
- Reference something specific from their original message
- Include a clear call-to-action
- Keep it professional but personable
- Maximum 150 words
- Do NOT include a signature (we'll add that separately)

Respond in JSON format:
{
  "subject": "<email subject line>",
  "body": "<email body without signature>"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 512,
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

    const result = JSON.parse(jsonMatch[0]) as FollowUpEmailResult;

    return {
      subject: result.subject,
      body: result.body,
    };
  } catch (error) {
    console.error("Follow-up generation error:", error);
    // Return a default follow-up on error
    return {
      subject: `Re: ${request.leadSubject}`,
      body: `Hi ${request.senderName},\n\nThank you for reaching out. We're interested in learning more about your needs and how we can help.\n\nBest regards,\n${request.clientName}`,
    };
  }
}

export function buildEmailWithSignature(
  body: string,
  clientName: string,
  clientEmail: string,
  clientPhone?: string
): string {
  const signature = `

---
${clientName}
${clientEmail}${clientPhone ? `\n${clientPhone}` : ""}`;

  return body + signature;
}
