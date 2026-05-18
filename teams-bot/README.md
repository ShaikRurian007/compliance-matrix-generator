# Microsoft Teams bot

This bot lets Teams users upload an RFP PDF in chat, analyse it with Gemini, and receive the generated compliance matrix as an Excel attachment.

## Prerequisites
- Node.js 20+
- An Azure Bot registration with the Microsoft Teams channel enabled
- A Microsoft Teams app package that references the bot ID
- A Gemini API key, either server-side or supplied per chat

## Files
- `index.js` — Express host and Bot Framework adapter
- `bot.js` — Teams chat flow and attachment handling
- `gemini.js` — Gemini request logic and model aliases
- `parseJSON.js` — resilient JSON repair and parsing
- `buildExcel.js` — Excel workbook generation with ExcelJS

## Local setup
1. Copy `.env.example` to `.env`.
2. Set `MicrosoftAppId`, `MicrosoftAppPassword`, and optionally `GEMINI_API_KEY`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the bot:
   ```bash
   npm start
   ```
5. Expose `http://localhost:3978/api/messages` through a tunnel when testing from Azure Bot Service or Teams.

## Chat commands
- `key <value>` — store a Gemini API key for the current conversation
- `model flash` — use Gemini 2.0 Flash
- `model flash-lite` — use Gemini 2.0 Flash-Lite
- `model 1.5-flash` — use Gemini 1.5 Flash
- `reset` — clear the stored per-chat key and reset the model

## Azure deployment
1. Create an Azure Bot resource and copy its app ID and password.
2. Deploy this folder to Azure App Service or Azure Container Apps.
3. Set the messaging endpoint to:
   `https://<your-app>.azurewebsites.net/api/messages`
4. Add these app settings in Azure:
   - `MicrosoftAppId`
   - `MicrosoftAppPassword`
   - `GEMINI_API_KEY` (optional shared default)
   - `GEMINI_MODEL` (optional, defaults to `gemini-2.0-flash`)

## Teams installation
1. In Azure Bot Service, add the Microsoft Teams channel.
2. Create a Teams app package in the Teams Developer Portal.
3. Register the bot in the app manifest using the Azure Bot app ID.
4. Install the app into a team or personal scope.

## GitHub Actions deployment
The workflow at `.github/workflows/deploy-teams-bot.yml` builds the bot on pushes to `main`.

Set these repository values before enabling deployment:
- Repository variable: `AZURE_TEAMS_BOT_WEBAPP_NAME`
- Repository secret: `AZURE_TEAMS_BOT_PUBLISH_PROFILE`

If either value is missing, the workflow will skip the deploy step.

## Security notes
- User-supplied Gemini API keys stay only in in-memory conversation state.
- Uploaded PDFs are processed in memory and discarded after the response is sent.
- Bot Framework request authentication is enforced by the SDK.
