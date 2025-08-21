const express = require("express");
const app = express();
app.use(express.json());
require("dotenv").config();
const services = require('./services/services.js')
const twilio = require('twilio')

async function generateSummary(responseData, convertions) {

    let prompt = `You have to conclude the response of the user in the one word from the converstaions of the user to the Agent just conclude that the response from the user is from the ${convertions}`

    const createResponseParams = {
        model: "gpt-4o-mini",
        input: responseData,
        instructions: prompt,
    };
    let processTimeStart = Date.now()
    let response = await services.openai.responses.create(createResponseParams);
    let processTime = Date.now() - processTimeStart
    console.log("LLmProcessTime", processTime)

    const messages = response.output || [];
    const assistantMessage = messages.find(m => m.role === "assistant");

    return assistantMessage.content[0].text || "Sorry I cannot conclude from the given conversation";
}


let UserResponse = [];
let DefinedResponse = [];
let recall_url = process.env.recall_url;
app.post("/bulk-call", async (req, res) => {
    const { name, channel, prompt, csvFile, convertions } = req.body;
    console.log(name, channel, prompt, csvFile, convertions);
    DefinedResponse = [...DefinedResponse,...convertions]

    const csvData = fs.readFileSync(csvFile, "utf8");
    const rows = csvData.split("\n");
    const headers = rows[0].split(",");
    const data = rows.slice(1).map(row => {
        const values = row.split(",");
        return headers.reduce((acc, header, index) => {
            acc[header] = values[index];
            return acc;
        }, {});
    });
    console.log(data);

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const { name, phone } = row;
        const response = await fetch(`${process.env.SERVER_URL}/call`, {
            method: "POST",
            body: JSON.stringify({
                name, prompt, to: phone, from: process.env.TWILIO_PHONE_NO, twilio_sid: process.env.TWILIO_ACCOUNT_SID, twilio_token: process.env.TWILIO_AUTH_TOKEN, recall_url
            })
        })
        const responseData = await response.json();
        console.log(responseData)
        // const summary = generateSummary(responseData, convertions);
        // UserResponse.push({ phone });
    }

    console.log(UserResponse);

    res.status(200).json({ message: "Campaign Done successfully" });
})

app.post('/response', (req, res) => {
    const { phone, conversations } = req.body;
    const summary = generateSummary(conversations, );
    UserResponse.push(`${phone} : ${summary}`);
    console.log(UserResponse)
    res.status(201).json({"message":"Added the user response"})
})

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});









//         url: `https://call-server.shipfast.studio/livekit/voice?name=${req.body.name}&prompt=${req.body.prompt}`,     line 2511