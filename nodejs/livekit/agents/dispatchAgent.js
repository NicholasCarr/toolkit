import { AgentDispatchClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';
dotenv.config();

const agentDispatchClient = new AgentDispatchClient(process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET);

const metadata = {
    assistant_id: "3b267431-d910-43e1-8f5e-68b6e3314032",
    account_id: "16cc7902-f71c-4bb5-bbc6-2a8287392aa1",
    container_id: "16cc7902-f71c-4bb5-bbc6-2a8287392aa1",
    job_type: "outbound_call",
    outbound_number: "+61435757026",
}

// this will create invoke an agent with agentName: test-agent to join `my-room`
const dispatch = await agentDispatchClient.createDispatch('outbound-call', 'aue-shared-dev', {
    metadata: JSON.stringify(metadata),
});
console.log('created dispatch', dispatch);
