const express = require("express");
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
require("dotenv").config();
const { services } = require('./services/services.js')
const fs = require("fs");
const multer = require('multer');
const upload = multer();

async function generateSummary(conversations, convertions) {

    let categoriesList = convertions;
    let responseData = conversations.map(c => `${c.role}: ${c.content}`).join("\n");

    let prompt = `Classify the user's response into ONE of the following categories: ${categoriesList}. Conversation:\n\n${responseData}`;

    // console.log("prompt", prompt);


    const createResponseParams = {
        model: "gpt-4o-mini",
        input: prompt
    };
    let processTimeStart = Date.now()
    let response = await services.openai.responses.create(createResponseParams);
    let processTime = Date.now() - processTimeStart
    console.log("LLmProcessTime", processTime)

    let text = "";
    if (response && typeof response.output_text === "string") {
        text = response.output_text;
    } else if (response && Array.isArray(response.output) && response.output[0]?.content?.[0]?.text) {
        text = response.output[0].content[0].text;
    }

    return (text || "Sorry I cannot conclude from the given conversation").trim().split(/\s+/);
}

let UserResponse = [];
let DefinedResponse = [];
let CampaignContacts = [];
let recall_url = process.env.recall_url;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.post("/bulk-call", upload.single('csvFile'), async (req, res) => {
    const { name, channel, prompt, csvFile, convertions } = req.body || {};
    // console.log(name, channel, prompt, csvFile, convertions);
    DefinedResponse = Array.isArray(convertions) ? convertions : (convertions ? [convertions] : []);
    // reset previous run results
    UserResponse = [];

    let csvData;
    if (req.file && req.file.buffer) {
        csvData = req.file.buffer.toString("utf8");
    } else if (csvFile) {
        csvData = fs.readFileSync(csvFile, "utf8");
    } else {
        return res.status(400).json({ error: "Provide csvFile path or upload csvFile as form-data file" });
    }
    const rows = csvData.trim().split(/\r?\n/);
    const headers = rows[0].split(",").map(h => h.trim());
    const data = rows.slice(1).filter(Boolean).map(row => {
        const values = row.split(",");
        return headers.reduce((acc, header, index) => {
            acc[header] = values[index];
            return acc;
        }, {});
    });
    console.log(data);
    // Track all contacts for this campaign so we can show non-responders too
    CampaignContacts = Array.isArray(data) ? data.map(row => ({ name: row.name, phone: row.phone })) : [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const { name, phone } = row;
        try {
            const response = await fetch(`${process.env.SERVER_URL}/call`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name, prompt, to: phone, from: process.env.TWILIO_PHONE_NO, twilio_sid: process.env.TWILIO_ACCOUNT_SID, twilio_token: process.env.TWILIO_AUTH_TOKEN, recall_url
                })
            })
            continue;
            // console.log(responseData)
        } catch (err) {
            // console.error("Fetch to /call failed", err);
            continue;
        }
        // const summary = generateSummary(responseData, convertions);
        // UserResponse.push({ phone });
    }

    // console.log(UserResponse);

    res.status(200).json({ message: "Campaign Done successfully" });
})

app.post('/response', async (req, res) => {
    const { phone, conversation } = req.body;
    // console.log("conversations", conversation)
    try {
        const summary = await generateSummary(conversation, DefinedResponse);
        UserResponse.push({ phone, summary });
        console.log(UserResponse)
        res.status(201).json({ "message": "Added the user response" })
    } catch (err) {
        // console.error("Failed to summarize response", err);
        res.status(500).json({ error: "Failed to summarize response" });
    }
})

// Expose collected results for the frontend to poll
app.get('/results', (req, res) => {
    // Build a map of responses by phone for quick lookup
    const phoneToResponse = new Map(
        (UserResponse || []).filter(r => r && r.phone).map(r => [String(r.phone), r])
    );

    const merged = (CampaignContacts || []).map(contact => {
        const key = String(contact.phone);
        const found = phoneToResponse.get(key);
        const summary = found ? found.summary : null;
        const summaryText = Array.isArray(summary) ? summary.join(' ') : (summary ? String(summary) : '');
        return {
            name: contact.name || '',
            phone: contact.phone || '',
            responded: Boolean(found),
            summary: summary,
            summaryText: summaryText
        };
    });

    res.json({ results: merged });
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});