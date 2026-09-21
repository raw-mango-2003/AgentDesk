import { GoogleGenAI } from '@google/genai';
import type { KnowledgeItem } from '../../lib/conversationEngine.js';
import { integrationStore } from '../integrations/integrationStore.js';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const configured = integrationStore.getPlatformConfig('gemini_ai');
  const apiKey = configured.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  return aiClient;
}

/**
 * Resilient grounded Gemini content generator.
 * Falls back to the deterministic conversation engine when Gemini is unavailable.
 */
export async function generateGroundedGeminiResponse(
  business: any,
  targetedKnowledge: KnowledgeItem[],
  userQuery: string,
  currentTopic: string | null
): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai || targetedKnowledge.length === 0) {
    return null;
  }

  const knowledgeContext = targetedKnowledge
    .map(k => `[Title: ${k.title}]\\n${k.content}`)
    .join('\\n\\n---\\n\\n');

  const assistantName = business.agentSettings?.agentName ||
    (business.name ? `${business.name} AI Assistant` : 'AI Assistant');
  const assistantRole = business.agentSettings?.role || 'AI Receptionist & Admissions Assistant';
  const businessName = business.name || 'our business';

  const prompt = `You are ${assistantName}, the ${assistantRole} for "${businessName}" (${business.industry || 'Business'}).

STRICT DIRECTIVES:
1. IDENTITY: Your name is "${assistantName}" representing "${businessName}".
2. STRICT IDENTITY PROHIBITION: You must NEVER speak, reveal, or output tenantId, businessId, database IDs, document IDs, UUIDs, internal slugs, internal configuration keys, or system codes to the customer.
3. KNOWLEDGE SCOPE: You represent ONLY "${businessName}". Answer the customer's question strictly and ONLY using the verified knowledge base below.
4. NEVER invent or mention any course, pricing, phone number, address, or details from any other company.
5. If the requested information is not in the verified knowledge base, state politely that this detail is not available for ${businessName} and offer to connect them with human support.

[VERIFIED KNOWLEDGE BASE FOR ${businessName.toUpperCase()}]:
${knowledgeContext}

Customer Question: "${userQuery}"
Active Topic in Conversation: ${currentTopic || 'General'}

Provide a concise, helpful, and natural receptionist response:`;

  const attemptModelCall = async (modelName: string): Promise<string | null> => {
    try {
      const responsePromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 300,
        }
      });

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 3500)
      );
      const result = await Promise.race([responsePromise, timeoutPromise]);

      if (result && result.text) return result.text.trim();
      return null;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const isOverloaded =
        errorMsg.includes('503') ||
        errorMsg.includes('high demand') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('429');

      if (isOverloaded) {
        console.log(`[Gemini AI] Model ${modelName} experiencing high demand (503/429), trying fallback...`);
      } else {
        console.log(`[Gemini AI] Model ${modelName} note: ${errorMsg.slice(0, 100)}`);
      }
      return null;
    }
  };

  const configuredModel = integrationStore.getPlatformConfig('gemini_ai').model;
  const primaryResult = await attemptModelCall(configuredModel || 'gemini-3.7-flash');
  if (primaryResult) return primaryResult;

  const fallbackResult = await attemptModelCall('gemini-3.1-flash-lite');
  if (fallbackResult) return fallbackResult;

  return null;
}
