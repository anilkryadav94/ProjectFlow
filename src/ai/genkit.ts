
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { GENKIT_ENV } from 'genkit/environment';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  // Log developer-friendly errors
  dev: GENKIT_ENV === 'dev',
  // Log to Google Cloud Logging in production
  logSink: GENKIT_ENV === 'prod' ? 'gcp' : 'dev',
  // Allow the AI SDK to read environment variables
  enableTracing: true,
});
