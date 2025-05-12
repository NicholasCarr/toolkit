import OpenAI from "openai";
import prompts from "./prompts/prompts.js";
import dotenv from "dotenv";
dotenv.config();

export async function openaiAnalysis(model, call) {
    const client = new OpenAI();

    const completion = await client.chat.completions.create({
        model,
        temperature: 0,
        messages: [
            {
                role: "system",
                content: prompts.callAnalysis,
            },
            {
                role: "user", content: `Here is an example layout for the Call Summary and Review:
                ${prompts.callAnalysisExample}`
            },
            { role: "assistant", content: 'Ok I will only provide the Call Summary and Review in the same format as the provided example.' },
            {
                role: "user", content: `Here is a phone call transcript for a Call Summary and Review:
                Call ID: ${call.uniqueId}
                Start: ${call.cdr.start}
                End: ${call.cdr.end}
                Duration: ${call.cdr.duration}
                Ring Time: ${call.cdr.ring_sec}
                Direction: ${call.direction}
                Source Name: ${call.cdr.src_name}
                Source Caller ID: ${call.cdr.src_did}
                Destination Caller ID: ${call.cdr.dst_did}
                Call Events: ${JSON.stringify(call.cdr.events)}
                Call QoS: ${JSON.stringify(call.cdr.qos)}
                Transcript: ${call.diarized_transcript}`
            }
        ],
    });

    return completion.choices[0].message.content;
}