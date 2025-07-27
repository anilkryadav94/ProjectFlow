
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Firebase & AI Integration

This application is configured to use Firebase Authentication, Firestore, and Google AI via Genkit. To connect it to your Firebase project and enable AI features, you need to set up the following environment variables in a `.env` file at the root of your project.

### Firebase Configuration

1.  Go to your Firebase project settings.
2.  Under "General", find your web app configuration.
3.  Copy the values into your `.env` file like this:

```
NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="1:..."
```

### Google AI (Gemini) Configuration

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to get your API key.
2. Add the key to your `.env` file:

```
GEMINI_API_KEY="your-api-key-here"
```

The Genkit SDK will automatically use this environment variable to make calls to the Gemini API.

### Firestore Index Requirement

This application requires specific Firestore composite indexes to efficiently query and sort data for the user dashboards.

**If you see an error in the browser console about a missing index**, you MUST create it. The application might appear to work, but certain dashboards (like Processor, QA) will not load data until the index is created.

1.  Look for an error message in your browser's developer console that starts with `FirebaseError: The query requires an index.`
2.  The error message will contain a long URL. **Copy this entire URL.**
3.  Paste the URL into a new browser tab and press Enter.
4.  This will take you directly to the index creation screen in your Firebase project's console with all the fields pre-filled.
5.  Click the **"Create Index"** button. The index will take a few minutes to build. Once it's ready, your application will be able to fetch data correctly.
