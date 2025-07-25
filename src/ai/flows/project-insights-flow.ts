
'use server';

/**
 * @fileOverview An AI flow for querying project data using natural language.
 *
 * - askProjectInsights - The main function to ask a question about projects.
 * - InsightResponse - The structured output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';
import { getAllProjects } from '@/services/project-service';

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

export const InsightResponseSchema = z.object({
  responseType: z.enum(['text', 'chart']).describe("The type of response to render. Use 'chart' for data visualizations and 'text' for all other answers."),
  data: z.any().describe("The data for the response. For 'text', this is a string. For 'chart', this is a JSON array of objects, typically with 'name' and 'value' keys."),
});

export type InsightResponse = z.infer<typeof InsightResponseSchema>;

const insightsPrompt = ai.definePrompt({
  name: 'projectInsightsPrompt',
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
    const llmResponse = await insightsPrompt(query);
    const response = llmResponse.output();
    if (!response) {
      throw new Error('The AI failed to generate a response.');
    }
    return response;
  }
);

export async function askProjectInsights(query: string): Promise<InsightResponse> {
  return projectInsightsFlow(query);
}
