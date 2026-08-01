require("dotenv").config();

const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Home route
app.get("/", (req, res) => {
    res.send("🚀 Metups WhatsApp API is running.");
});

// Meta Webhook Verification
app.get("/webhook", (req, res) => {

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("Verification Request Received");

    console.log({
        mode,
        token,
        challenge
    });

    if (
        mode === "subscribe" &&
        token === process.env.VERIFY_TOKEN
    ) {

        console.log("✅ WEBHOOK VERIFIED");

        return res.status(200).send(challenge);

    }

    console.log("❌ Verification Failed");

    return res.sendStatus(403);

});

// Receive Messages
app.post("/webhook", (req, res) => {

    console.log("===============");
    console.log("Incoming Webhook");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("===============");

    res.sendStatus(200);

});

app.listen(PORT, () => {

    console.log("=================================");
    console.log("🚀 Metups WhatsApp Server Started");
    console.log(`Running on port ${PORT}`);
    console.log("=================================");

});