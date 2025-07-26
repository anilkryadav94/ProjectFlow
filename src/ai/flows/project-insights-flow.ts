
'use server';

/**
 * @fileOverview An AI flow for querying a given set of project data using natural language.
 *
 * - askProjectInsights - The main function to ask a question about projects.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';
import type { Project } from '@/lib/data';

// Define the schema for the input, which now includes the project data.
const InsightRequestSchema = z.object({
  query: z.string().describe("The user's natural language question about the projects."),
  projects: z.any().describe("A JSON array of project objects to be analyzed."),
});
export type InsightRequest = z.infer<typeof InsightRequestSchema>;

// Define the schema for the expected structured output from the AI.
const InsightResponseSchema = z.object({
  responseType: z.enum(['text', 'chart']).describe("The type of response to render. Use 'chart' for data visualizations and 'text' for all other answers."),
  data: z.any().describe("The data for the response. For 'text', this is a string. For 'chart', this is a JSON array of objects, typically with 'name' and 'value' keys."),
});
export type InsightResponse = z.infer<typeof InsightResponseSchema>;


const insightsPrompt = ai.definePrompt({
  name: 'projectInsightsPromptFromData',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: { schema: InsightRequestSchema },
  output: { schema: InsightResponseSchema },
  system: `You are an expert project management analyst.
Your task is to answer the user's question based on the provided JSON project data.
- Today's date is ${new Date().toDateString()}.
- If the user asks for a chart, provide the data in a JSON array format suitable for a bar chart. Each object in the array MUST have a 'name' key for the x-axis label and a 'value' key for the y-axis count (e.g., \`[{ name: 'Client A', value: 10 }, { name: 'Client B', value: 15 }]\`). The \`responseType\` must be 'chart'.
- For all other questions, provide a clear, concise text-based answer. The \`responseType\` must be 'text'.
- Analyze the data to answer the user's query accurately.
- Do not use any tools. The project data is provided directly in the prompt.
- If the query is unclear or cannot be answered with the available data, provide a helpful message stating what you can do.`,
  prompt: `User Question: {{{query}}}\n\nProject Data (JSON):\n\`\`\`json\n{{{json projects}}}\n\`\`\`\n`,
});

const projectInsightsFlow = ai.defineFlow(
  {
    name: 'projectInsightsFlow',
    inputSchema: InsightRequestSchema,
    outputSchema: InsightResponseSchema,
  },
  async (request) => {
    // Generate the full response from the prompt, passing the request object.
    const response = await insightsPrompt(request);
    
    // The structured, schema-compliant output is in the `output` property.
    const structuredOutput = response.output;

    if (structuredOutput) {
      // If we have a valid structured output that matches our schema, return it.
      return structuredOutput;
    }

    // --- Fallback Logic ---
    const rawTextResponse = response.text;
    if (rawTextResponse) {
      // If we have raw text, return it so the user sees something.
      console.warn("AI returned unstructured text instead of the expected JSON object. Raw text:", rawTextResponse);
      return { responseType: 'text', data: `The AI returned an unexpected response. Raw text: ${rawTextResponse}` };
    }

    // If there's no structured output and no raw text, throw a clear error.
    console.error("AI failed to generate a valid structured response or any text output.", response);
    throw new Error('The AI failed to generate a valid response. Please try rephrasing your question or check the server logs.');
  }
);


export async function askProjectInsights(request: InsightRequest): Promise<InsightResponse> {
  return projectInsightsFlow(request);
}
