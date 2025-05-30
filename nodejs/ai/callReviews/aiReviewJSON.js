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

// Main function to process call reviews
async function processCallReviews() {
    try {
        // Read the CSV file
        const combinedCsv = await readCsv(path.join(__dirname, 'combined.csv'));
        
        // Create reviews directory if it doesn't exist
        const reviewsDir = path.join(__dirname, 'reviews');
        if (!fs.existsSync(reviewsDir)) {
            fs.mkdirSync(reviewsDir, { recursive: true });
        }

        // Get unique session IDs
        const sessionIds = [...new Set(combinedCsv.map(row => row.session_id))];
        
        console.log(`Processing ${sessionIds.length} sessions...`);

        // Process each session
        for (const sessionId of sessionIds) {
            console.log(`Processing session: ${sessionId}`);
            
            const sessionRows = combinedCsv.filter(row => row.session_id === sessionId);
            const sessionData = sessionRows.map(row => row.message).join("\n");
            
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 1,
                    max_tokens: 16384,
                    top_p: 1,
                    messages: [
                        {
                            role: "system",
                            content: `You are a helpful assistant that reviews phone call logs.
You will be provided the database export with each row including call metrics and the call transcript between a user and the ai assistant.

## CALL QUALITY
- Provide feedback on the quality of the call from a technical view.
- Provide feedback on the quality of the call from a user experience view.
- Provide feedback on the quality of the call from a business view.

## CALL CONTENT
- Provide feedback on the conversation from the assistants point of view.
- Provide feedback on the conversation from the contacts point of view.

## ANSWER DISPOSITION
- Identify how the call connected
- Did it connect to a voicemail, IVR, human, or other

## CALL SUMMARY
- Provide a summary of the call.

## RECOMMENDATIONS
- Provide recommendations for the assistant to improve the call quality and conversation.

## OUTPUT
- Provide your output in JSON format.
- Provide the output in the following format:
{
    "sessionId": "sessionId",
    "summary": "summary",
    "quality": {
        "technical": "technical review",
        "userExperience": "user experience review",
        "business": "business review"
    },
    "content": {
        "assistant": "assistant review",
        "contact": "contact review"
    },
    "answerDisposition": {
        "voicemail": "voicemail review",
        "ivr": "ivr review",
        "human": "human review",
        "other": "other review"
    },
    "recommendations": "recommendations"
}`,
                        },
                        {
                            role: "user",
                            content: sessionData,
                        },
                    ],
                });
                
                const reviewContent = response.choices[0].message.content;
                console.log(`Session ${sessionId} review completed.`);
                
                // Save review to file
                const outputPath = path.join(reviewsDir, `${sessionId}.json`);
                fs.writeFileSync(outputPath, JSON.stringify({
                    sessionId: sessionId,
                    review: reviewContent,
                    timestamp: new Date().toISOString()
                }, null, 2));
                
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
