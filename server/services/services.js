export const services = {
    twilio: new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN),
    polly: new PollyClient({
        region: "us-east-1",
        credentials: {
            accessKeyId: process.env.accessKeyId,
            secretAccessKey: process.env.secretAccessKey,
        },
    }),
    openai: new OpenAI({ apiKey: process.env.OPEN_AI }),
    gemini: genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",  // or "gemini-2.0-flash-thinking-exp"
        // Optional: Add safety settings
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    })
};
