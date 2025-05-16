import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const sipClient = new SipClient(process.env.LIVEKIT_URL,
                                process.env.LIVEKIT_API_KEY,
                                process.env.LIVEKIT_API_SECRET);

const dispatchRules = await sipClient.listSipDispatchRule();
// const dispatchRule = await sipClient.deleteSipDispatchRule('SDR_ZochZbRdNzcT');

console.log(dispatchRules);
console.log(JSON.stringify(dispatchRules, null, 2));