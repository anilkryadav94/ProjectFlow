
'use server';

/**
 * @fileOverview An AI flow for querying project data using natural language.
 * This flow uses a tool to fetch data directly from the database.
 *
 * - askProjectInsights - The main function to ask a question about projects.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';
import { getAllProjects } from '@/services/project-service';

const InsightRequestSchema = z.object({
  query: z.string().describe("The user's natural language question about the projects."),
});
export type InsightRequest = z.infer<typeof InsightRequestSchema>;

const InsightResponseSchema = z.object({
  responseType: z.enum(['text', 'chart']).describe("The type of response to render. Use 'chart' for data visualizations and 'text' for all other answers."),
  data: z.any().describe("The data for the response. For 'text', this is a string. For 'chart', this is a JSON array of objects, where each object MUST have a 'name' key for the x-axis label and a 'value' key for the y-axis count."),
});
export type InsightResponse = z.infer<typeof InsightResponseSchema>;

const getProjectsTool = ai.defineTool(
  {
    name: 'getProjectsTool',
    description: 'Fetches all project data from the database to answer a user query.',
    inputSchema: z.object({}),
    outputSchema: z.any(),
  },
  async () => {
    console.log('getProjectsTool: Fetching all projects from Firestore...');
    const projects = await getAllProjects();
    console.log(`getProjectsTool: Fetched ${projects.length} projects.`);
    return projects;
  }
);


const insightsPrompt = ai.definePrompt({
  name: 'projectInsightsPromptWithTool',
  model: googleAI.model('gemini-1.5-flash-latest'),
  tools: [getProjectsTool],
  input: { schema: InsightRequestSchema },
  output: { schema: InsightResponseSchema },
  system: `You are an expert project management analyst.
Your task is to answer the user's question about project data.
- First, you MUST use the provided 'getProjectsTool' to fetch all the project data. It is the only way you can access the information.
- Once you have the data, analyze it to answer the user's query accurately.
- Today's date is ${new Date().toDateString()}.
- If the user asks for a chart, provide the data in a JSON array format suitable for a bar chart. Each object in the array MUST have a 'name' key for the x-axis label and a 'value' key for the y-axis count (e.g., \`[{ "name": "Client A", "value": 10 }, { "name": "Client B", "value": 15 }]\`). The \`responseType\` must be 'chart'.
- For all other questions, provide a clear, concise text-based answer. The \`responseType\` must be 'text'.
- If the query is unclear or cannot be answered with the available data, provide a helpful message stating what you can do.`,
  prompt: `User Question: {{{query}}}`,
});

const projectInsightsFlow = ai.defineFlow(
  {
    name: 'projectInsightsFlow',
    inputSchema: InsightRequestSchema,
    outputSchema: InsightResponseSchema,
  },
  async (request) => {
    const response = await insightsPrompt(request);
    const structuredOutput = response.output;

    if (structuredOutput) {
      return structuredOutput;
    }

    const rawTextResponse = response.text;
    if (rawTextResponse) {
      console.warn("AI returned unstructured text instead of the expected JSON object. Raw text:", rawTextResponse);
      return { responseType: 'text', data: `The AI returned an unexpected response. Raw text: ${rawTextResponse}` };
    }

    console.error("AI failed to generate a valid structured response or any text output.", response);
    throw new Error('The AI failed to generate a valid response. Please try rephrasing your question or check the server logs.');
  }
);


export async function askProjectInsights(request: InsightRequest): Promise<InsightResponse> {
  return projectInsightsFlow(request);
}
