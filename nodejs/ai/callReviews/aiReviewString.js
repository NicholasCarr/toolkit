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

        // Get unique session IDs
        // const sessionIds = [...new Set(combinedCsv.map(row => row.session_id))];
        const sessionIds = [...new Set(conversationJson.map(obj => obj.session_id))];
        console.log(`Processing ${sessionIds.length} sessions...`);

        // Process each session
        for (const sessionId of sessionIds) {
            console.log(`Processing session: ${sessionId}`);
            
            // const sessionRows = combinedCsv.filter(row => row.session_id === sessionId);
            // const conversation = combinedCsv.filter(row => row.source_table === "conversation");
            // console.log(conversation);
            // const sessionData = sessionRows.map(row => row.message).join("\n");
            const session = conversationJson.filter(obj => obj.session_id === sessionId);
            const conversation = session.filter(obj => obj.source_table === "conversation");
            // console.log(conversation);
            const sessionData = conversation.map(obj => obj.message).join("\n");
            
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    temperature: 1,
                    max_tokens: 16384,
                    top_p: 1,
                    messages: [
                        {
                            role: "system",
                            content: `You are an expert call analyst.                                    
                                    You are reviewing an outbound call from the AI Assistant John to a Contact.
                                    Extract the Contact name and number (called identity) from the contact object: ${conversation[0].contact}

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

                                ## OUTPUT FORMAT
                                {
                                    "start": "2025-05-19 19:03:28",
                                    "end": "2025-05-19 19:05:42",
                                    "call_duration": "[duration in seconds]",
                                    "contact": "Thomas",
                                    "contact_number": "+18182513024",
                                    "connection_type": "[human|voicemail|ivr|no_answer|unknown]",
                                    "confidence_score": "[1-10 scale for connection_type assessment]",
                                    "call_summary": "[2-3 sentence summary]",
                                    "key_events": ["list", "of", "notable", "events"],
                                    "issues": ["any", "problems", "detected"],
                                    "performance": "[brief assessment of AI behavior]",
                                    "outcome": "[successful|failed|partial|unknown]"
                                }
                                `
                        },
                        // {
                        //     role: "user",
                        //     content: `Here is an example of the output:
                        //     {
                        //             "Start": "2025-05-19 19:03:28",
                        //             "End": "2025-05-19 19:05:42",
                        //             "Duration": 134,
                        //             "Contact Name": "Thomas",
                        //             "Contact Number": "+18182513024",
                        //             "connection_type": "[human|voicemail|ivr|no_answer|unknown]",
                        //             "confidence_score": "[1-10 scale for connection_type assessment]",
                        //             "call_duration": "[duration in seconds/minutes]",
                        //             "call_summary": "[2-3 sentence summary]",
                        //             "key_events": ["list", "of", "notable", "events"],
                        //             "technical_issues": ["any", "problems", "detected"],
                        //             "ai_performance": "[brief assessment of AI behavior]",
                        //             "outcome": "[successful|failed|partial|unknown]"
                        //         }
                        //     {
                        //         "Start": "2025-05-19 19:03:28",
                        //         "End": "2025-05-19 19:05:42",
                        //         "Duration": 134,
                        //         "Contact Name": "Thomas",
                        //         "Contact Number": "+18182513024",
                        //         "Answer Disposition": "Human",
                        //         "Call Summary": "The call was successfully connected to Thomas. John the AI Assistant engaged in a conversation providing the required information or assistance based on Thomas's inquiries.",
                        //         "Recommendations": "Ensure that responses are concise and relevant to the user's questions to enhance user satisfaction."
                        //     }`
                        // },
                        {
                            role: "user",
                            content: `Here is the call data:
                                    start: ${conversation[0].start}
                                    end: ${conversation[0].end}
                                    call_duration: ${conversation[0].duration}
                                    ai_metrics: ${conversation[0].data}
                                    Call logs and transcript:
                                    ${sessionData}`,
                        },
                    ],
                });
                
                const reviewContent = response.choices[0].message.content;
                console.log(`Session ${sessionId} review completed.`);
                
                // Save review to file
                const outputPath = path.join(reviewsDir, `${sessionId}.txt`);
                fs.writeFileSync(outputPath, reviewContent);
                
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
