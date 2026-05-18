require('dotenv').config();
const express = require('express');
const {
  BotFrameworkAdapter,
  ConversationState,
  MemoryStorage
} = require('botbuilder');
const { ComplianceMatrixBot } = require('./bot');

const app = express();
app.use(express.json({ limit: '50mb' }));

const adapter = new BotFrameworkAdapter({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword
});

adapter.onTurnError = async (context, error) => {
  console.error('[onTurnError]', error);
  await context.sendActivity('❌ The bot hit an unexpected error while processing your request. Please try again.');
};

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const bot = new ComplianceMatrixBot(conversationState);
const port = Number(process.env.PORT) || 3978;

app.post('/api/messages', (req, res) => {
  adapter.processActivity(req, res, async (turnContext) => {
    await bot.run(turnContext);
  });
});

app.listen(port, () => {
  console.log(`Teams bot listening on port ${port}`);
});
