import ollama from "ollama";
import prompts from "./prompts/prompts.js";
import dotenv from "dotenv";
dotenv.config();

export async function ollamaAnalysis(model, call) {

const response = await ollama.chat({
  model,
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
        Date/Time: ${call.date_time}
        Duration: ${call.duration}
        Direction: ${call.direction}
        Source Caller ID: ${call.source_callerid}
        Destination Caller ID: ${call.destination_callerid}
        Transcript: ${call.diarized_transcript}`
    }
],
})
console.log(response.message.content)
    return response.message.content;
}