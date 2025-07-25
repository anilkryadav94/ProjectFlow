
'use server';

/**
 * @fileOverview An AI flow for querying project data using natural language.
 *
 * - askProjectInsights - The main function to ask a question about projects.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAllProjects } from '@/services/project-service';
import { googleAI } from '@genkit-ai/googleai';

// Define the schema for the expected structured output from the AI.
const InsightResponseSchema = z.object({
  responseType: z.enum(['text', 'chart']).describe("The type of response to render. Use 'chart' for data visualizations and 'text' for all other answers."),
  data: z.any().describe("The data for the response. For 'text', this is a string. For 'chart', this is a JSON array of objects, typically with 'name' and 'value' keys."),
});

// Define the TypeScript type from the Zod schema for use within this file.
export type InsightResponse = z.infer<typeof InsightResponseSchema>;

const getProjectsTool = ai.defineTool(
  {
    name: 'getAllProjects',
    description: 'Retrieves all project data from the database. Use this tool to answer any user question about project data, statuses, assignments, or metrics.',
    inputSchema: z.object({}),
    outputSchema: z.any(),
  },
  async () => {
    return await getAllProjects();
  }
);

const insightsPrompt = ai.definePrompt({
  name: 'projectInsightsPrompt',
  model: googleAI.model('gemini-1.5-pro-latest'), // Switched to a more capable model
  input: { schema: z.string() },
  output: { schema: InsightResponseSchema },
  tools: [getProjectsTool],
  system: `You are an expert project management analyst.
Your task is to answer user questions based on the provided project data from the getAllProjects tool.
- Today's date is ${new Date().toDateString()}.
- If the user asks for a chart, provide the data in a JSON array format suitable for a bar chart (e.g., \`[{ name: 'Client A', value: 10 }, { name: 'Client B', value: 15 }]\`). The \`responseType\` should be 'chart'.
- For all other questions, provide a clear, concise text-based answer. The \`responseType\` should be 'text'.
- Always use the getAllProjects tool to get the data you need. Do not make up information.
- Analyze the data to answer the user's query accurately.
- If the query is unclear or cannot be answered with the available data, provide a helpful message stating what you can do.`,
});

const projectInsightsFlow = ai.defineFlow(
  {
    name: 'projectInsightsFlow',
    inputSchema: z.string(),
    outputSchema: InsightResponseSchema,
  },
  async (query) => {
    // Await the prompt to get the full generation response.
    const response = await insightsPrompt(query);
    
    // In Genkit v1.x, the structured output is directly available in the .output property.
    const structuredOutput = response.output;

    // Check if the AI returned a valid, structured output.
    if (!structuredOutput) {
       // This can happen if the model fails to follow instructions or if there's an issue.
       // We can check the raw response for clues as a fallback.
       const rawTextResponse = response.text;
       if (rawTextResponse) {
          // If we have raw text, return it so the user sees something.
          return { responseType: 'text', data: `The AI returned an unexpected response. Raw text: ${rawTextResponse}` };
       }
      // If there's no output and no raw text, throw a clear error.
      throw new Error('The AI failed to generate a valid structured response. Please try rephrasing your question.');
    }

    // If we have a valid structured output, return it.
    return structuredOutput;
  }
);


export async function askProjectInsights(query: string): Promise<InsightResponse> {
  return projectInsightsFlow(query);
}
