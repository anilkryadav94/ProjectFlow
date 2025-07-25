
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

// Define the schema inline as it cannot be exported from a 'use server' file.
const InsightResponseSchema = z.object({
  responseType: z.enum(['text', 'chart']).describe("The type of response to render. Use 'chart' for data visualizations and 'text' for all other answers."),
  data: z.any().describe("The data for the response. For 'text', this is a string. For 'chart', this is a JSON array of objects, typically with 'name' and 'value' keys."),
});

// Define the type for use within this file.
type InsightResponse = z.infer<typeof InsightResponseSchema>;

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
  model: googleAI.model('gemini-1.5-flash-latest'),
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
    // By accessing .output directly on the prompt call, Genkit handles extracting
    // the final structured output, even after tool use. This is the most reliable way.
    const response = await insightsPrompt(query);
    const structuredOutput = response.output;

    if (!structuredOutput) {
       // This can happen if the model fails to follow instructions or if there's an issue.
       // We can check the raw response for clues.
       const rawTextResponse = response.text;
       if (rawTextResponse) {
          return { responseType: 'text', data: `The AI returned an unexpected response. Raw text: ${rawTextResponse}` };
       }
      throw new Error('The AI failed to generate a valid structured response. Please try rephrasing your question.');
    }

    return structuredOutput;
  }
);


export async function askProjectInsights(query: string): Promise<InsightResponse> {
  return projectInsightsFlow(query);
}
