<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1pQdH9SoDuml34JlaWCT-llmfdQBM6yk8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` with:
   `VITE_SUPABASE_URL=...`
   `VITE_SUPABASE_ANON_KEY=...`
   `VITE_AI_IMPORT_PROXY_URL=...` (optional, required for AI-import)
3. Run the app:
   `npm run dev`

AI-import expects the proxy to accept POST JSON:
`{ prompt, text, markers }` and return:
`{ date: "YYYY-MM-DD" | null, results: [{ markerId, value }] }`
