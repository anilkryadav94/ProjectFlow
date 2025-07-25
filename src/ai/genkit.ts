
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  // Log developer-friendly errors
  dev: process.env.GENKIT_ENV === 'dev',
  // Log to Google Cloud Logging in production
  logSink: process.env.GENKIT_ENV === 'prod' ? 'gcp' : 'dev',
  // Allow the AI SDK to read environment variables
  enableTracing: true,
});
