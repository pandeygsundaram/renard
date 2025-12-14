import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  sanitizedContent?: string;
  contentType?: string;
  tags?: string[];
  confidence?: number;
}

export interface MessageValidationInput {
  content: string;
  activityType: string;
  metadata?: Record<string, any>;
}

/**
 * Validates message content using LLM to:
 * 1. Filter spam/inappropriate content
 * 2. Validate content quality and relevance
 * 3. Sanitize and normalize content
 * 4. Extract metadata/tags
 */
export async function validateMessageContent(
  input: MessageValidationInput
): Promise<ValidationResult> {
  try {
    const { content, activityType, metadata } = input;

    // Quick check: reject empty or too short content
    if (!content || content.trim().length < 3) {
      return {
        isValid: false,
        reason: 'Content is too short or empty',
      };
    }

    // Quick check: reject extremely long content (>10000 chars)
    if (content.length > 10000) {
      return {
        isValid: false,
        reason: 'Content exceeds maximum length of 10000 characters',
      };
    }

    // Use LLM to validate and enrich content
    const systemPrompt = `You are a content validator for a developer productivity tracking system.
Your job is to:
1. Determine if the content is valid, relevant developer activity (code, commands, chat with AI, browser activity)
2. Filter out spam, gibberish, or inappropriate content
3. Optionally sanitize sensitive information (API keys, passwords, tokens)
4. Extract relevant tags or categories
5. Assess content quality and relevance

Respond ONLY with a valid JSON object in this exact format:
{
  "isValid": true/false,
  "reason": "explanation if invalid",
  "sanitizedContent": "cleaned version of content (remove sensitive data)",
  "contentType": "code|command|chat|browser|other",
  "tags": ["tag1", "tag2"],
  "confidence": 0.0-1.0
}`;

    const userPrompt = `Activity Type: ${activityType}
Content: ${content}
${metadata ? `\nMetadata: ${JSON.stringify(metadata)}` : ''}

Validate this content and respond with JSON only.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cheap for validation
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from LLM');
    }

    const result: ValidationResult = JSON.parse(responseText);

    // Log validation results for monitoring
    console.log('[LLM Validator] Result:', {
      activityType,
      isValid: result.isValid,
      contentType: result.contentType,
      confidence: result.confidence,
      reason: result.reason,
    });

    return result;
  } catch (error) {
    console.error('[LLM Validator] Error:', error);

    // In case of LLM failure, apply basic heuristic validation
    // to avoid blocking all messages
    return fallbackValidation(input);
  }
}

/**
 * Fallback validation when LLM is unavailable
 * Uses simple heuristics to validate content
 */
function fallbackValidation(input: MessageValidationInput): ValidationResult {
  const { content, activityType } = input;

  // Basic heuristics
  const hasCode = /[{}();]/.test(content);
  const hasCommand = /^[a-z-]+\s/.test(content);
  const isReasonableLength = content.length >= 10 && content.length <= 5000;

  // Simple spam detection
  const spamKeywords = ['buy now', 'click here', 'limited offer', 'viagra', 'casino'];
  const hasSpam = spamKeywords.some(keyword =>
    content.toLowerCase().includes(keyword)
  );

  // Detect potential API keys or tokens (basic pattern)
  const hasApiKey = /[a-zA-Z0-9]{32,}/.test(content);

  let sanitizedContent = content;
  if (hasApiKey) {
    // Redact potential API keys
    sanitizedContent = content.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED_KEY]');
  }

  const isValid = isReasonableLength && !hasSpam;

  return {
    isValid,
    reason: isValid ? undefined : hasSpam ? 'Spam detected' : 'Invalid content format',
    sanitizedContent,
    contentType: hasCode ? 'code' : hasCommand ? 'command' : 'other',
    tags: [],
    confidence: 0.7, // Lower confidence for fallback
  };
}

/**
 * Batch validation for multiple messages
 * More efficient than validating one by one
 */
export async function validateMessagesBatch(
  inputs: MessageValidationInput[]
): Promise<ValidationResult[]> {
  // For now, validate sequentially with small delay to avoid rate limits
  // In production, could use parallel validation with proper rate limiting
  const results: ValidationResult[] = [];

  for (const input of inputs) {
    const result = await validateMessageContent(input);
    results.push(result);

    // Small delay to avoid rate limits
    if (inputs.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
