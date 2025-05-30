import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const sipClient = new SipClient(process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET);

const trunks = await sipClient.listSipInboundTrunk();

console.log(trunks);