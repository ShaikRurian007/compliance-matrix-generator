# compliance-matrix-generator

This repository contains the browser-based RFP compliance matrix generator and a Microsoft Teams bot that can run the same PDF → Gemini → Excel workflow through chat.

## Browser tool
Open `RFP_Compliance_Matrix_Generator.html` in a browser to use the original HTML experience.

## Microsoft Teams bot
The Teams bot lives in `teams-bot/`.

It supports:
- storing a per-chat Gemini API key
- switching Gemini models with chat commands
- uploading PDF files from Teams
- returning the generated compliance matrix as an Excel attachment

See `teams-bot/README.md` for setup, Azure registration, Teams installation, deployment details, and the **Tenant-ready checklist (Azure + Teams Developer Portal)** section for exact integration steps.
