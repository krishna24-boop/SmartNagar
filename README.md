<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b932ce84-1446-4bac-bc7a-a4f285254109

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Optional: set `MONGO_URI` in [.env.local](.env.local) to a MongoDB Atlas or local MongoDB connection string to persist users and complaints
4. Run the app:
   `npm run dev`

Set the `DEMO_*_PASSWORD` values from [.env.example](.env.example) in your ignored `.env.local` before starting the server. Do not commit real API keys, database URIs, or passwords.

Example MongoDB URI:
`mongodb+srv://<username>:<password>@cluster.mongodb.net/nagarvani`

If `MONGO_URI` is not configured, the app continues in its demo in-memory mode.
