import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const sipClient = new SipClient(process.env.LIVEKIT_URL,
                                process.env.LIVEKIT_API_KEY,
                                process.env.LIVEKIT_API_SECRET);

// delete the dispatch rule
await sipClient.deleteSipDispatchRule('SDR_qNKKwM3479mo');

console.log('Dispatch rule deleted');