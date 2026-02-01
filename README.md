<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1H2R5h3Ot74ZWHLR4iS2ygNGMDvqJS1Wx

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env` (or `.env.local`) in the project root with:
   - `VITE_SUPABASE_URL` – your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` – your Supabase anon/public key  
   (Vite only exposes variables prefixed with `VITE_` to the client.)
3. Optionally set `GEMINI_API_KEY` in `.env` if using Gemini.
4. Run the app:
   `npm run dev`  
   Restart the dev server after changing `.env`.
