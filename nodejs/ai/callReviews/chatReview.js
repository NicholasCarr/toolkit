import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import csvParser from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

// Function to read CSV file
function readCsv(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

function readJson(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) reject(err);
            resolve(JSON.parse(data));
        });
    });
}
// Main function to process call reviews
async function processCallReviews() {
    try {
        // Read the CSV file
        const combinedCsv = await readCsv(path.join(__dirname, 'logsMessagesConv.csv'));
        // Read JSON file
        const conversationJson = await readJson(path.join(__dirname, 'logsMessagesConv.json'));
        console.log(`Imported ${conversationJson.length} objects`);
        // Create reviews directory if it doesn't exist
        const reviewsDir = path.join(__dirname, 'reviews');
        if (!fs.existsSync(reviewsDir)) {
            fs.mkdirSync(reviewsDir, { recursive: true });
        }
        // create reviews.json file if it doesn't exist
        const reviewsFile = path.join(__dirname, 'reviews', 'reviews.json');
        if (!fs.existsSync(reviewsFile)) {
            fs.writeFileSync(reviewsFile, JSON.stringify([], null, 2));
        }

        let processedSessionIds = new Set();
        try {
            const existingReviewsData = await readJson(reviewsFile);
            if (Array.isArray(existingReviewsData)) {
                existingReviewsData.forEach(review => {
                    if (review.session_id) {
                        processedSessionIds.add(review.session_id);
                    }
                });
            }
            console.log(`Found ${processedSessionIds.size} already processed sessions in ${reviewsFile}.`);
        } catch (error) {
            console.warn(`Could not read or parse ${reviewsFile}. Assuming no sessions are processed yet. Error: ${error.message}`);
            // Ensure reviewsFile is initialized if it caused an error (e.g., was empty or malformed)
            fs.writeFileSync(reviewsFile, JSON.stringify([], null, 2));
        }

        // Get unique session IDs
        // const sessionIds = [...new Set(combinedCsv.map(row => row.session_id))];
        const sessionIds = [...new Set(conversationJson.map(obj => obj.session_id))];
        console.log(`Processing ${sessionIds.length} sessions...`);

        // Process each session
        for (const sessionId of sessionIds) {
            if (processedSessionIds.has(sessionId)) {
                console.log(`Session ${sessionId} has already been processed. Skipping.`);
                continue;
            }
            console.log(`Processing session: ${sessionId}`);
            
            // const sessionRows = combinedCsv.filter(row => row.session_id === sessionId);
            // const conversation = combinedCsv.filter(row => row.source_table === "conversation");
            // console.log(conversation);
            // const sessionData = sessionRows.map(row => row.message).join("\n");
            const session = conversationJson.filter(obj => obj.session_id === sessionId);
            const messages = session.filter(obj => obj.session_id === sessionId && obj.source_table === "message");
            const conversation = session.filter(obj => obj.source_table === "conversation");
            const start = conversation[0]?.start;
            const end = conversation[0]?.end;
            const call_duration = conversation[0]?.duration;
            const contactJsonString = conversation[0]?.contacts; // Renamed for clarity
            // Parse the JSON string into an object
            const parsedContact = JSON.parse(contactJsonString);

            // Extract the contact name and number
            // The structure is {"PA_M3A8yz96KCWC": {"name": "Thomas", "identity": "+18182513024"}}
            const contactKeys = Object.keys(parsedContact);
            // console.log(contactKeys); // Should now show the actual ID like ["PA_M3A8yz96KCWC"]
            const callId = contactKeys[0]; // Get the first key (the unique contact ID)
            const contact_name = parsedContact[callId]?.name;
            const contact_number = parsedContact[callId]?.identity;
            // console.log(callId, contact_name, contact_number);
            const ai_metrics = conversation[0].data;
            // console.log(conversation);
            const sessionData = session.map(obj => obj.message).join("\n");
            const messageData = messages.map(obj => obj.message).join("\n");
            
            const callReview = {
                session_id: sessionId,
                call_id: callId,
                start: start,
                end: end,
                call_duration: call_duration,
                contact_name: contact_name,
                contact_number: contact_number
            };

            try {
                // Review messages
                const messageResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    temperature: 1,
                    max_tokens: 16384,
                    top_p: 1,
                    messages: [
                        {
                            role: "system",
                            content: `You are an expert call analyst.                                    
                                    You are reviewing an outbound call from the AI Assistant John to a Contact.
                                    The contact name is ${contact_name} and the contact number is ${contact_number}.

## Analysis Requirements:

### Call Connection Type
Review the call transcript and determine if the call connected to:
   - Human (live person answered)
   - Voicemail (went to voicemail system)
   - IVR/Automated System (interactive voice response or automated menu)
   - No Answer/Failed
   - Unknown (insufficient data)
   Voicemail example: You have reach the voicemail of...
   IVR example: Press 1 for ...
   Human example: Hello John, no I am not interested in that.

### Call Quality Indicators
   - Call duration and actual talk time
   - Any interruptions or technical issues
   - Audio quality indicators (if available in logs)

### Call Summary
   - Key outcomes or results
   - Any notable events or issues

### Key Metrics
   - Total call duration
   - Number of message exchanges
   - AI vs Human speech ratio (if determinable)
   - Any error events or technical issues

                                ## OUTPUT
                                - Provide your output as json.

                                ## OUTPUT FORMAT / EXAMPLE
                                {                                    
                                    "connection_type": "[human|voicemail|ivr|no_answer|unknown]",
                                    "call_summary": "[2-3 sentence summary]",
                                    "key_events": ["list", "of", "notable", "events"],
                                    "issues": ["any", "problems", "detected"],
                                    "performance": "[brief assessment of AI behavior]",
                                    "outcome": "[successful|failed|partial|unknown]"
                                }`
                        },
                        {
                            role: "user",
                            content: `Call transcript:
                                    ${messageData}`,
                        },
                    ],
                });
                
                const messageReview = messageResponse.choices[0].message.content;
                //   "message_review": "```json\n{\n    \"connection_type\": \"voicemail\",\n    \"call_summary\": \"The call reached a voicemail system for Kim Ringeri. John left a message offering a promotional ticket offer for IB FutureFest and sent it successfully.\",\n    \"key_events\": [\"voicemail reached\", \"promo offer message recorded\", \"message sent successfully\"],\n    \"issues\": [\"none\"],\n    \"performance\": \"The AI assistant operated as expected, delivering the promotional message smoothly and without interruptions.\",\n    \"outcome\": \"partial\"\n}\n```",
                const cleanedMessageReview = messageReview.replace(/```json\n|\n```/g, '');
                const messageReviewJson = JSON.parse(cleanedMessageReview);
                // console.log(messageReviewJson);
                callReview.message_review = messageReviewJson;

                // Review session
                const sessionResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    temperature: 1,
                    max_tokens: 16384,
                    top_p: 1,
                    messages: [
                        {
                            role: "system",
                            content: `You are an expert call analyst.                                    
                                    You are reviewing an outbound call from the AI Assistant John to a Contact.
                                    The contact name is ${contact_name} and the contact number is ${contact_number}.
                                    
## Analysis Requirements:
   - Any interruptions or technical issues
   - Audio quality indicators (if available in logs)

### Call Summary
   - Key outcomes or results
   - Any notable events or issues

### Key Metrics
   - Number of message exchanges
   - AI vs Human speech ratio (if determinable)
   - Any error events or technical issues

                                ## OUTPUT
                                - Provide your output as json.

                                ## OUTPUT FORMAT
                                {                                    
                                    "key_events": ["list", "of", "notable", "events"],
                                    "issues": ["any", "problems", "detected"],
                                    "performance": "[brief assessment of AI service behavior]",
                                    "outcome": "[successful|failed|partial|unknown]"
                                }`
                        },
                        {
                            role: "user",
                            content: `Here is the ai metric data: ${ai_metrics}
                                    AI Assistant session log data: ${sessionData}`,
                        },
                    ],
                });

                const sessionReview = sessionResponse.choices[0].message.content;
                const cleanedSessionReview = sessionReview.replace(/```json\n|\n```/g, '');
                const sessionReviewJson = JSON.parse(cleanedSessionReview);
                // console.log(sessionReviewJson);
                callReview.session_review = sessionReviewJson;

                // add to existing json file
                const existingReviews = await readJson(path.join(__dirname, 'reviews', 'reviews.json'));
                existingReviews.push(callReview);
                fs.writeFileSync(path.join(__dirname, 'reviews', 'reviews.json'), JSON.stringify(existingReviews, null, 2));

                console.log(`Session ${sessionId} review completed.`);
                
                
            } catch (error) {
                console.error(`Error processing session ${sessionId}:`, error.message);
                // Continue with next session
                continue;
            }
        }
        
        console.log("All sessions processed successfully!");
        
    } catch (error) {
        console.error("Error reading CSV file:", error);
        process.exit(1);
    }
}

// Run the main function
processCallReviews().catch(console.error);
