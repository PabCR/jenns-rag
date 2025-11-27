import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Recommendation } from "../types";
import { getAiClient } from "./client";

// Define Zod schemas for structured output validation and JSON Schema conversion
const recommendationSchema = z.object({
  rank: z.number().int().describe("The rank of the recommendation based on relevance to the user's query."),
  title: z.string().describe("A concise title for the clinical recommendation."),
  relevance_score: z.number().int().min(0).max(100).describe("A relevance score between 0 and 100 indicating how well this matches the query."),
  summary: z.string().describe("A brief summary of the findings from the medical document."),
  actionable_step: z.string().describe("A clear, concrete actionable step for the nurse to take."),
  source_document: z.string().describe("The name of the source document where this information was found.")
});

const recommendationsArraySchema = z.array(recommendationSchema);

/**
 * Generates recommendations using RAG via the File Search tool.
 * Supports querying multiple stores simultaneously.
 */
export const analyzeDocuments = async (
  query: string,
  storeIds: string | string[]
): Promise<Recommendation[]> => {
  // Normalize to array
  const storeIdsArray = Array.isArray(storeIds) ? storeIds : [storeIds];
  
  if (storeIdsArray.length === 0) {
    throw new Error("No knowledge base connected.");
  }

  try {
    const ai = getAiClient();

    const prompt = `Based on the documents in the FileSearchStore(s), analyze the following query and return a JSON array of recommendations. Each recommendation should have: rank (integer), title (string), relevance_score (integer 0-100), summary (string), actionable_step (string), and source_document (string). Return only valid JSON, no markdown.

Query: ${query}`;

    // Normalize all store IDs to correct format
    const normalizedStoreIds = storeIdsArray.map(storeId => 
      storeId.startsWith('fileSearchStores/') 
        ? storeId 
        : `fileSearchStores/${storeId}`
    );

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{
            fileSearch: {
                fileSearchStoreNames: normalizedStoreIds
            }
        }]
      }
    });

    // Verify retrieval occurred via grounding metadata
    const candidates = (response as any).candidates;
    if (!candidates || !candidates[0]) {
      console.warn("No candidates in response");
      return [];
    }

    const groundingMetadata = candidates[0].groundingMetadata;
    if (!groundingMetadata) {
      console.warn("No grounding metadata - File Search may not have retrieved chunks. Response structure:", JSON.stringify(candidates[0], null, 2));
      return [];
    }

    const groundingChunks = groundingMetadata.groundingChunks || [];
    if (groundingChunks.length === 0) {
      console.warn("No chunks retrieved from FileSearchStore");
      return [];
    }

    console.log(`Retrieved ${groundingChunks.length} chunk(s) from FileSearchStore`);

    // Parse response text as JSON (model should return structured JSON)
    const responseText = response.text.trim();
    if (!responseText) return [];

    // Extract JSON if wrapped in markdown
    let jsonText = responseText;
    const jsonBlock = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlock) {
      jsonText = jsonBlock[1].trim();
    }

    // Parse and validate
    const parsedData = JSON.parse(jsonText);
    const result = recommendationsArraySchema.parse(parsedData) as Recommendation[];
    
    return result.sort((a, b) => a.rank - b.rank);

  } catch (error) {
    console.error("Gemini RAG Error:", error);
    if (error instanceof z.ZodError) {
      console.error("Schema Validation Failed:", error.issues);
      throw new Error("Received malformed data from AI model.");
    }
    throw error;
  }
};

