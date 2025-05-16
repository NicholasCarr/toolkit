import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const sipClient = new SipClient(process.env.LIVEKIT_URL,
                                process.env.LIVEKIT_API_KEY,
                                process.env.LIVEKIT_API_SECRET);

// Create dispatch rule
const rule = {
  roomPrefix: "usw-buzztrail-001-",
  type: 'individual',
  attributes: {
    job_type: 'testing_rule_level',
    inbound_number: '+13233002360',
  },
  metadata: '{"job_type": "inbound_call_rule", "inbound_number": "+13233002360", "assistant_id": "3970ea98-e349-46ac-b038-b4b11f983531", "account_id": "b7a4f9b7-ee77-4d7c-9781-a9a5b11159b8", "container_id": "784e0e2f-0675-4e40-9ab6-f6b7f2c501e5"}'

};
const options = {
  name: 'usw-buzztrail-001-dispatch',
  trunkIds: ['ST_AaxkdUM3hz8i'],
  roomConfig: {
    agents: [
      {
        agentName: "usw-buzztrail-001", // CONTAINER NAME
        metadata: '{"job_type": "inbound_call", "inbound_number": "+13233002360", "assistant_id": "3970ea98-e349-46ac-b038-b4b11f983531", "account_id": "b7a4f9b7-ee77-4d7c-9781-a9a5b11159b8", "container_id": "784e0e2f-0675-4e40-9ab6-f6b7f2c501e5"}'
      },
    ],
  },
};

const dispatchRule = await sipClient.createSipDispatchRule(rule, options);
console.log(dispatchRule);