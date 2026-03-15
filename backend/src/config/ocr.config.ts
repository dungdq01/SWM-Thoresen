export const ocrConfig = () => ({
  googleVision: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    // Hoặc dùng credentials JSON inline (cho Docker/CI):
    credentials: process.env.GOOGLE_CLOUD_CREDENTIALS_JSON
      ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON)
      : undefined,
  },
});
