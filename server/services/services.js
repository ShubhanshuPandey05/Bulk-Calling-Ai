const twilio = require('twilio');
const OpenAI = require("openai");
require('dotenv').config();

const services = {
    twilio: new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN),
    openai: new OpenAI({ apiKey: process.env.OPEN_AI })
};

module.exports = {services}