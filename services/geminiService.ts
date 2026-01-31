import { GoogleGenAI, Type } from "@google/genai";
import { AspectRatio, Resolution, DesignAnalysis } from "../types";

// LocalStorage key for API Key
const STORAGE_KEY = 'GEMINI_API_KEY_STORAGE';

// Get API Key from localStorage or env
export const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim() !== '') {
      return stored;
    }
  }
  return process.env.API_KEY || '';
};

// Save API Key to localStorage
export const setApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, key);
  }
};

// Singleton pattern helper
const getAiClient = (): GoogleGenAI => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key not found. Please connect your API Key.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to format errors nicely
const handleGeminiError = (error: any) => {
  console.error("Gemini API Raw Error:", error);

  let msg = error.message || error.toString();

  // Try to inspect the full error object if possible
  try {
    const stringified = JSON.stringify(error);
    if (stringified.includes("429") || stringified.includes("RESOURCE_EXHAUSTED")) {
      msg = "RESOURCE_EXHAUSTED";
    }
    if (stringified.includes("503") || stringified.includes("Overloaded") || stringified.includes("overloaded")) {
      msg = "503 Overloaded";
    }
    if (stringified.includes("500") || stringified.includes("Internal Server Error")) {
      msg = "500 Internal Server Error";
    }
  } catch (e) { }

  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    throw new Error("⚠️ Đã hết hạn mức (Quota) API miễn phí hoặc đang bị giới hạn tốc độ. Vui lòng đợi một chút rồi thử lại.");
  }

  if (msg.includes("503") || msg.includes("overloaded") || msg.includes("Overloaded")) {
    throw new Error("⚠️ Máy chủ AI đang quá tải (503). Vui lòng đợi 10-15 giây rồi thử lại.");
  }

  if (msg.includes("500") || msg.includes("Internal Server Error")) {
    throw new Error("⚠️ Lỗi máy chủ Google (500). Vui lòng thử lại, hệ thống đang gặp sự cố tạm thời.");
  }

  throw error;
};

/**
 * Phase 1: Deep Insight Analysis
 */
export const analyzeDesignConcept = async (
  productImagesBase64: string[],
  userContext: string
): Promise<DesignAnalysis[]> => {
  try {
    const ai = getAiClient();
    const modelId = 'gemini-3-flash-preview';
    const parts: any[] = [];

    let promptText = `
      You are a Visionary Creative Director and Product Strategist.
      
      INPUT: ${productImagesBase64.length} images.
      CONTEXT FROM USER: "${userContext || "Market analysis and redesign"}"

      YOUR MISSION:
      1. **DEEP IDENTITY ANALYSIS**: Detect EXACTLY who or what is in the image. 
      2. **BRAINSTORM 5 CONCEPTS**:
         - Create concepts that bridge the "Subject Identity" with the "User Context".

      CRITICAL RULES:
      1. **PRESERVE CORE IDENTITY**: If it's a specific character or item, keep its recognizable features.
      2. **MATERIAL REALISM**: Maintain the material family appropriate for the concept.

      GENERATE 5 CONCEPTS (JSON):
      For each concept, define in VIETNAMESE (except optimizedPrompt):
      1. 'conceptName': Creative name.
      2. 'occasion': Specific usage/season (e.g., Summer, Tet Holiday, Gift).
      3. 'targetAudience': Who is this for?
      4. 'keyMessage': A slogan focusing on value.
      5. 'reasoning': EXPLAIN WHY you created this concept? What problem does it solve or what emotion does it evoke? (Write 2-3 sentences).
      6. 'strengths': Best visual features.
      7. 'weaknesses': What to avoid.
      8. 'optimizedPrompt': A professional English prompt describing the subject in this specific concept.
    `;

    parts.push({ text: promptText });
    productImagesBase64.forEach((base64) => {
      parts.push({ inlineData: { mimeType: 'image/png', data: base64 } });
    });

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              conceptName: { type: Type.STRING },
              occasion: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              keyMessage: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              optimizedPrompt: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    const results = JSON.parse(text) as DesignAnalysis[];
    return Array.isArray(results) ? results : [results];

  } catch (error) {
    handleGeminiError(error);
    throw error;
  }
};

/**
 * Analyzes Reference Image + Specific Prompt (+ Optional Design Reference)
 */
export const analyzeCustomConcepts = async (
  base64Reference: string,
  userPrompt: string,
  styleName: string | undefined,
  base64DesignRef?: string | null
): Promise<DesignAnalysis[]> => {
  try {
    const ai = getAiClient();
    const modelId = 'gemini-3-flash-preview';
    const parts: any[] = [];

    const promptText = `
      You are a Senior Art Director & Brand Strategist.
      
      INPUT DATA:
      - IMAGE 1: The "SUBJECT".
      ${base64DesignRef ? '- IMAGE 2: The "DESIGN REFERENCE" (Style Source).' : ''}
      - USER INSTRUCTION: "${userPrompt}"
      ${styleName ? `- STYLE FILTER: "${styleName}"` : ""}

      YOUR MISSION:
      Generate 5 HIGH-END CREATIVE CONCEPTS that elevate the Subject.

      METHODOLOGY:
      1. **Understand the Subject (Image 1)**: Keep its core identity.
      ${base64DesignRef ? `
      2. **Deconstruct the Design Reference (Image 2)**:
         - EXTRACT the "Visual DNA" (Lighting, Color, Vibe).
      3. **Synthesize & Elevate**:
         - Apply the Visual DNA of (2) to Subject (1).
      ` : '2. Modify the Subject according to the User Instruction with high creativity.'}
      
      GENERATE 5 VARIATIONS (JSON) IN VIETNAMESE (except optimizedPrompt):
      For each variation:
      1. 'conceptName': Name of the concept.
      2. 'occasion': Context of use.
      3. 'targetAudience': Target demographic.
      4. 'keyMessage': Why is this better?
      5. 'reasoning': EXPLAIN THE DESIGN RATIONALE. Why does this mix of elements work effectively?
      6. 'strengths': Key visual elements borrowed from Design Ref or created.
      7. 'weaknesses': What strictly to avoid.
      8. 'optimizedPrompt': A detailed ENGLISH prompt.
         - Structure: [Subject Description] + [Context/Background] + [Lighting/Style] + [User Instruction details].
         - Keywords: "High quality", "Masterpiece", "Trending on ArtStation", "Commercial Photography".
    `;

    parts.push({ text: promptText });
    // Image 1: Subject
    parts.push({ inlineData: { mimeType: 'image/png', data: base64Reference } });

    // Image 2: Design Ref (Optional)
    if (base64DesignRef) {
      parts.push({ inlineData: { mimeType: 'image/png', data: base64DesignRef } });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              conceptName: { type: Type.STRING },
              occasion: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              keyMessage: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              optimizedPrompt: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    const results = JSON.parse(text) as DesignAnalysis[];
    return Array.isArray(results) ? results : [results];

  } catch (error) {
    handleGeminiError(error);
    throw error;
  }
};

/**
 * Phase 2: Text to Image (Insight Mode)
 */
export const generateDesignVariation = async (
  optimizedPrompt: string,
  config: { aspectRatio: AspectRatio; resolution: Resolution }
): Promise<string> => {
  try {
    if (!optimizedPrompt) throw new Error("Prompt is empty");
    const ai = getAiClient();

    // Model Selection logic
    const isPro = config.resolution === '2K';
    const modelId = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    // Strict prompt to ensure image output
    const parts = [{ text: `${optimizedPrompt} \n\nIMPORTANT: Return ONLY the generated image. Do NOT provide any text description.` }];

    const imageConfig: any = {
      aspectRatio: config.aspectRatio
    };
    if (isPro) {
      imageConfig.imageSize = '2K';
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        imageConfig: imageConfig
      }
    });

    return extractImageFromResponse(response);
  } catch (error) {
    handleGeminiError(error);
    throw error;
  }
};

/**
 * Custom Mode: Reference Image + Prompt (+ Design Ref) -> Image
 */
export const generateImageFromReference = async (
  base64Reference: string,
  userPrompt: string,
  config: { aspectRatio: AspectRatio; resolution?: Resolution },
  base64DesignRef?: string | null
): Promise<string> => {
  try {
    const ai = getAiClient();

    // Model Selection logic
    const isPro = config.resolution === '2K';
    const modelId = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const finalPrompt = `
      ${base64DesignRef ? 'INPUT 1: Main Subject. \nINPUT 2: Design Reference (Style Source).' : 'Input Image: Reference subject.'}
      User Instruction: "${userPrompt}"
      
      TASK: Create a professional image.
      ${base64DesignRef
        ? `
        1. ANALYZE Input 2 (Design Ref): Extract the lighting, color grading, composition style, and mood.
        2. APPLY that visual style to Input 1 (Subject).
        3. INTEGRATE the Subject into a scene that matches the Input 2 context.
        4. ELEVATE the quality. Do not just copy pixels, create a cohesive commercial artwork.
        `
        : 'Modify the Subject according to the instruction.'}
      
      CRITICAL:
      - Preserve Identity of Subject (Input 1).
      - If Design Ref is present, the output MUST look like it belongs to the same brand campaign as Design Ref.
      
      IMPORTANT: Return ONLY the generated image. Do NOT provide any text description.
    `;

    const parts: any[] = [];
    parts.push({ text: finalPrompt });
    parts.push({ inlineData: { mimeType: 'image/png', data: base64Reference } });

    if (base64DesignRef) {
      parts.push({ inlineData: { mimeType: 'image/png', data: base64DesignRef } });
    }

    const imageConfig: any = {
      aspectRatio: config.aspectRatio
    };
    if (isPro) {
      imageConfig.imageSize = '2K';
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        imageConfig: imageConfig
      }
    });

    return extractImageFromResponse(response);
  } catch (error) {
    handleGeminiError(error);
    throw error;
  }
};

// Helper to clean up code duplication
const extractImageFromResponse = (response: any): string => {
  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("No candidates returned from API.");
  }

  // Check for safety blocks explicitly
  if (candidate.finishReason === 'SAFETY') {
    throw new Error("⚠️ Ảnh bị chặn bởi bộ lọc an toàn (Safety Filter). Vui lòng điều chỉnh prompt hoặc đổi ảnh mẫu.");
  }

  // Sometimes finishReason is "STOP" but content is text-only (refusal)
  const contentParts = candidate.content?.parts;
  if (!contentParts || contentParts.length === 0) {
    throw new Error("API trả về dữ liệu rỗng (No content parts).");
  }

  let base64Image = '';

  // First, look for the image part
  for (const part of contentParts) {
    if (part.inlineData && part.inlineData.data) {
      base64Image = part.inlineData.data;
      break;
    }
  }

  if (!base64Image) {
    // If no image, check if there is text. This usually means Safety Refusal or Chatty model.
    const textPart = contentParts.find((p: any) => p.text);
    if (textPart) {
      // Strip out long text if necessary, but returning the text helps debug SAFETY blocks.
      const msg = textPart.text.length > 200 ? textPart.text.substring(0, 200) + "..." : textPart.text;
      throw new Error(`AI không tạo được ảnh (Có thể do bộ lọc an toàn hoặc prompt vi phạm): "${msg}"`);
    }
    throw new Error("API không trả về dữ liệu ảnh (Unknown Error: No inlineData).");
  }

  return `data:image/png;base64,${base64Image}`;
}