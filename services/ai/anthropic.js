import { Anthropic } from "@anthropic-ai/sdk";
import prompts from "./prompts/prompts.js";
import dotenv from "dotenv";
dotenv.config();

export async function anthropicMessage(model, type, message) {
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });
    let system;
    let messages;
    if (type === "callAnalysis") {
        system = prompts.callAnalysis;
        messages = [
            {
                role: "user", 
                content: `Here is an example layout for the Call Summary and Review:
                ${prompts.callAnalysisExample}`
            },
            { 
                role: "assistant", 
                content: 'Ok I will only provide the Call Summary and Review in the same format as the provided example.'
            },
            {
                role: "user", 
                content: `Here is a phone call transcript for a Call Summary and Review:
                Call ID: ${message.uniqueId}
                Start: ${message.cdr.start}
                End: ${message.cdr.end}
                Duration: ${message.cdr.duration}
                Ring Time: ${message.cdr.ring_sec}
                Direction: ${message.direction}
                Source Name: ${message.cdr.src_name}
                Source Caller ID: ${message.cdr.src_did}
                Destination Caller ID: ${message.cdr.dst_did}
                Call Events: ${JSON.stringify(message.cdr.events)}
                Call QoS: ${JSON.stringify(message.cdr.qos)}
                Transcript: ${message.diarized_transcript}`
            },
        ]
    } else {
        return {status: "error", message: "Invalid request type"}
    }

    const completion = await client.messages.create({
        model,
        max_tokens: 8192,
        temperature: 0,
        system,
        messages
    });
    if (!completion.content[0].text) {
        return {status: "error", message: "Failed to generate response"};
    }
    return completion.content[0].text;
}