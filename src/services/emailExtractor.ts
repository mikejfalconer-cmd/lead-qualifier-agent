/**
 * Email Lead Extractor
 * Extracts structured lead data from email content
 */

export interface ExtractedLead {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  website?: string;
  message?: string;
  subject?: string;
  confidence: number; // 0-100
}

/**
 * Extract lead information from email subject and body
 */
export function extractLeadFromEmail(
  subject: string,
  body: string,
  senderEmail: string,
  senderName?: string
): ExtractedLead {
  const extracted: ExtractedLead = {
    email: senderEmail,
    name: senderName,
    confidence: 0,
    subject,
    message: body,
  };

  let confidence = 0;

  // Extract name from subject if present
  const nameMatch = subject.match(/^(?:from|from:|name:|name)[\s:]*(.+?)(?:\s*-|\s*$)/i);
  if (nameMatch) {
    extracted.name = nameMatch[1].trim();
    confidence += 10;
  }

  // Extract company from subject
  const companyMatch = subject.match(/(?:company|from|org)[\s:]*(.+?)(?:\s*-|\s*$)/i);
  if (companyMatch) {
    extracted.company = companyMatch[1].trim();
    confidence += 10;
  }

  // Extract from body
  const lines = body.split('\n').map(line => line.trim()).filter(line => line);

  // Look for common patterns in email body
  for (const line of lines) {
    // Name patterns
    if (!extracted.name && line.match(/^name[\s:]*(.+)/i)) {
      const match = line.match(/^name[\s:]*(.+)/i);
      if (match) {
        extracted.name = match[1].trim();
        confidence += 15;
      }
    }

    // Company patterns
    if (!extracted.company && line.match(/^company[\s:]*(.+)/i)) {
      const match = line.match(/^company[\s:]*(.+)/i);
      if (match) {
        extracted.company = match[1].trim();
        confidence += 15;
      }
    }

    // Phone patterns
    if (!extracted.phone && line.match(/(?:phone|tel|mobile|cell)[\s:]*(.+)/i)) {
      const match = line.match(/(?:phone|tel|mobile|cell)[\s:]*(.+)/i);
      if (match) {
        extracted.phone = match[1].trim();
        confidence += 15;
      }
    }

    // Website patterns
    if (!extracted.website && line.match(/(?:website|web|url|site)[\s:]*(.+)/i)) {
      const match = line.match(/(?:website|web|url|site)[\s:]*(.+)/i);
      if (match) {
        extracted.website = match[1].trim();
        confidence += 15;
      }
    }

    // Email patterns (if different from sender)
    if (!extracted.email && line.match(/(?:email|e-mail|contact)[\s:]*(.+@.+\..+)/i)) {
      const match = line.match(/(?:email|e-mail|contact)[\s:]*(.+@.+\..+)/i);
      if (match) {
        extracted.email = match[1].trim();
        confidence += 10;
      }
    }
  }

  // Boost confidence if we have key fields
  if (extracted.name) confidence += 10;
  if (extracted.company) confidence += 10;
  if (extracted.phone) confidence += 10;
  if (extracted.website) confidence += 10;

  // Cap confidence at 100
  extracted.confidence = Math.min(confidence, 100);

  return extracted;
}

/**
 * Extract email addresses from text
 */
export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return Array.from(new Set(text.match(emailRegex) || []));
}

/**
 * Extract phone numbers from text
 */
export function extractPhoneNumbers(text: string): string[] {
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const matches: string[] = [];
  let match;

  while ((match = phoneRegex.exec(text)) !== null) {
    matches.push(match[0]);
  }

  return Array.from(new Set(matches));
}

/**
 * Extract websites/URLs from text
 */
export function extractWebsites(text: string): string[] {
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g;
  const matches: string[] = [];
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return Array.from(new Set(matches));
}

/**
 * Extract company names from text (basic heuristic)
 */
export function extractCompanyNames(text: string): string[] {
  const companyPatterns = [
    /(?:company|from|org|organization)[\s:]*([A-Z][a-zA-Z0-9\s&,.-]*)/gi,
    /(?:at|working at)[\s]*([A-Z][a-zA-Z0-9\s&,.-]*)/gi,
  ];

  const companies: string[] = [];

  for (const pattern of companyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const company = match[1].trim();
      if (company.length > 2 && company.length < 100) {
        companies.push(company);
      }
    }
  }

  return Array.from(new Set(companies));
}

/**
 * Generate a summary of extracted lead data
 */
export function generateLeadSummary(lead: ExtractedLead): string {
  const parts: string[] = [];

  if (lead.name) parts.push(`Name: ${lead.name}`);
  if (lead.email) parts.push(`Email: ${lead.email}`);
  if (lead.company) parts.push(`Company: ${lead.company}`);
  if (lead.phone) parts.push(`Phone: ${lead.phone}`);
  if (lead.website) parts.push(`Website: ${lead.website}`);

  return parts.join(' | ');
}

/**
 * Score lead quality based on extracted data
 */
export function scoreLeadQuality(lead: ExtractedLead): number {
  let score = 0;

  // Base score from extraction confidence
  score += lead.confidence * 0.5;

  // Bonus points for complete information
  if (lead.name) score += 10;
  if (lead.email) score += 10;
  if (lead.company) score += 15;
  if (lead.phone) score += 15;
  if (lead.website) score += 10;

  // Bonus for message length (more info = better lead)
  if (lead.message) {
    const messageLength = lead.message.length;
    if (messageLength > 100) score += 10;
    if (messageLength > 500) score += 5;
  }

  return Math.min(score, 100);
}
