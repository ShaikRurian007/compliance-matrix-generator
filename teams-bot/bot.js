const axios = require('axios');
const {
  ActivityTypes,
  CardFactory,
  TeamsActivityHandler,
  TurnContext
} = require('botbuilder');
const buildExcel = require('./buildExcel');
const { DEFAULT_MODEL, callGemini, resolveModelName } = require('./gemini');
const parseJSON = require('./parseJSON');

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_MIME = 'application/pdf';

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function isPdfAttachment(attachment) {
  const name = String(attachment?.name || '').toLowerCase();
  const contentType = String(attachment?.contentType || '').toLowerCase();
  const fileType = String(attachment?.content?.fileType || '').toLowerCase();
  return (
    contentType === PDF_MIME ||
    contentType === 'application/vnd.microsoft.teams.file.download.info' ||
    name.endsWith('.pdf') ||
    fileType === 'pdf'
  );
}

function getDownloadUrl(attachment) {
  return attachment?.content?.downloadUrl || attachment?.contentUrl || null;
}

function isLikelyApiKey(text) {
  return /^AIza[\w-]{20,}$/u.test(String(text || '').trim());
}

class ComplianceMatrixBot extends TeamsActivityHandler {
  constructor(conversationState) {
    super();
    this.conversationState = conversationState;
    this.sessionAccessor = this.conversationState.createProperty('complianceMatrixSession');

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded || []) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(this.createWelcomeActivity());
        }
      }
      await next();
    });

    this.onMessage(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });
  }

  async run(context) {
    await super.run(context);
    await this.conversationState.saveChanges(context, false);
  }

  async handleMessage(context) {
    const session = await this.sessionAccessor.get(context, () => ({
      apiKey: '',
      model: resolveModelName(process.env.GEMINI_MODEL) || DEFAULT_MODEL
    }));

    TurnContext.removeRecipientMention(context.activity);
    const text = String(context.activity.text || '').trim();
    const lowered = text.toLowerCase();
    const attachments = context.activity.attachments || [];
    const pdfAttachment = attachments.find(isPdfAttachment);

    if (pdfAttachment) {
      await this.processPdf(context, session, pdfAttachment);
      return;
    }

    if (attachments.length > 0) {
      await context.sendActivity('⚠ Please upload a PDF file so I can build the compliance matrix.');
      return;
    }

    if (!text || ['hello', 'hi', 'help', 'start'].includes(lowered)) {
      await context.sendActivity(this.createWelcomeActivity(session));
      return;
    }

    if (lowered === 'reset') {
      session.apiKey = '';
      session.model = resolveModelName(process.env.GEMINI_MODEL) || DEFAULT_MODEL;
      await context.sendActivity(
        process.env.GEMINI_API_KEY
          ? '✅ Session reset. Your saved API key was cleared, and the bot will fall back to the server default key if configured.'
          : '✅ Session reset. Your saved API key was cleared. Send `key <your-gemini-key>` when you are ready.'
      );
      return;
    }

    const keyMatch = text.match(/^key\s+(.+)$/iu);
    if (keyMatch || (!session.apiKey && isLikelyApiKey(text))) {
      session.apiKey = (keyMatch ? keyMatch[1] : text).trim();
      await context.sendActivity('✅ API key saved for this chat. Now upload an RFP PDF file.');
      return;
    }

    const modelMatch = text.match(/^model\s+(.+)$/iu);
    if (modelMatch) {
      const resolved = resolveModelName(modelMatch[1]);
      if (!resolved) {
        await context.sendActivity('⚠ Unknown model. Use `model flash`, `model flash-lite`, or `model 1.5-flash`.');
        return;
      }
      session.model = resolved;
      await context.sendActivity(`✅ Gemini model set to \`${resolved}\`.`);
      return;
    }

    const keyConfigured = Boolean(session.apiKey || process.env.GEMINI_API_KEY);
    await context.sendActivity(
      keyConfigured
        ? '📎 Upload a PDF to generate the compliance matrix, or use `model flash`, `model flash-lite`, `model 1.5-flash`, or `reset`.'
        : '🔑 Send `key <your-gemini-key>` first, then upload a PDF.'
    );
  }

  createWelcomeActivity(session = {}) {
    const model = session.model || resolveModelName(process.env.GEMINI_MODEL) || DEFAULT_MODEL;
    const usingDefaultKey = !session.apiKey && Boolean(process.env.GEMINI_API_KEY);
    const lines = [
      'Upload an RFP PDF and I will analyse it with Gemini, then return an Excel compliance matrix.',
      '',
      usingDefaultKey
        ? 'A server default Gemini key is available, or you can override it with `key <your-gemini-key>`.'
        : 'Send `key <your-gemini-key>` to get started.',
      'Use `model flash`, `model flash-lite`, or `model 1.5-flash` to switch Gemini models.',
      `Current model: ${model}`,
      'Use `reset` to clear the chat session.'
    ];

    return {
      attachments: [
        CardFactory.heroCard('👋 RFP Compliance Matrix bot', lines.join('\n'))
      ]
    };
  }

  async processPdf(context, session, attachment) {
    const apiKey = session.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await context.sendActivity('🔑 I need a Gemini API key before I can process PDFs. Send `key <your-gemini-key>` first.');
      return;
    }

    try {
      await this.sendTyping(context);
      const pdfBuffer = await this.downloadAttachment(context, attachment);
      const sizeLabel = formatFileSize(pdfBuffer.length);
      const sourceName = attachment.name || 'RFP.pdf';
      await context.sendActivity(
        sizeLabel ? `📄 Got it — ${sourceName} (${sizeLabel}). Analysing now...` : `📄 Got it — ${sourceName}. Analysing now...`
      );
      await this.sendStatus(context, '📤 Reading PDF…');
      await this.sendStatus(context, '🤖 Analysing with Gemini…');
      const rawResponse = await callGemini(pdfBuffer.toString('base64'), session.model, apiKey);
      const parsed = parseJSON(rawResponse);
      await this.sendStatus(context, '📊 Building Excel…');
      const { buffer, filename } = await buildExcel(parsed, sourceName);
      const uploadedAttachment = await this.uploadAttachment(context, buffer, filename, EXCEL_MIME);
      await context.sendActivity({
        text: '✅ Done! Here is your compliance matrix. Upload another PDF any time.',
        attachments: [uploadedAttachment]
      });
    } catch (error) {
      await context.sendActivity(`❌ ${error.message}`);
    }
  }

  async sendTyping(context) {
    await context.sendActivity({ type: ActivityTypes.Typing });
  }

  async sendStatus(context, message) {
    await this.sendTyping(context);
    await context.sendActivity(message);
  }

  async getBotAccessToken(context) {
    try {
      if (typeof context.adapter.buildCredentials !== 'function') {
        return null;
      }
      const credentials = await context.adapter.buildCredentials();
      if (!credentials || typeof credentials.getToken !== 'function') {
        return null;
      }
      const token = await credentials.getToken();
      return token?.accessToken || null;
    } catch (_) {
      return null;
    }
  }

  async downloadAttachment(context, attachment) {
    const downloadUrl = getDownloadUrl(attachment);
    if (!downloadUrl) {
      throw new Error('The uploaded file did not include a download URL. Please try attaching the PDF again.');
    }

    const headers = {};
    const accessToken = await this.getBotAccessToken(context);
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await axios.get(downloadUrl, {
      headers,
      responseType: 'arraybuffer',
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
      timeout: 180000
    });

    return Buffer.from(response.data);
  }

  async uploadAttachment(context, buffer, name, contentType) {
    const connectorClient = await context.adapter.createConnectorClient(context.activity.serviceUrl);
    const uploadResponse = await connectorClient.conversations.uploadAttachment(
      context.activity.conversation.id,
      {
        name,
        type: contentType,
        originalBase64: new Uint8Array(buffer),
        thumbnailBase64: new Uint8Array()
      }
    );

    const baseUri = connectorClient.baseUri.endsWith('/') ? connectorClient.baseUri : `${connectorClient.baseUri}/`;
    return {
      name,
      contentType,
      contentUrl: `${baseUri}v3/attachments/${uploadResponse.id}/views/original`
    };
  }
}

module.exports = {
  ComplianceMatrixBot
};
