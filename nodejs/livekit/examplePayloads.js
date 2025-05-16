// ctx.job when dispatched via API
const ctx = {
    id: 'AJ_RoX89BPazvGZ',
    room: { 
        sid: 'RM_xeoWCNNcjAH7', 
        name: 'cs-au-dev-_anonymous_RnhMEKE9c3tw', 
        empty_timeout: 300, 
        creation_time: 1746164439, 
        enabled_codecs: { mime: 'video/H264' },
        enabled_codecs: { mime: 'video/VP8' },
        enabled_codecs: { mime: 'video/VP9' },
        enabled_codecs: { mime: 'video/AV1' },
        enabled_codecs: { mime: 'audio/red' },
        enabled_codecs: { mime: 'audio/opus' },
        version: { unix_micro: 1746164439567629 },
        departure_timeout: 20,
        creation_time_ms: 1746164439397
    },
    metadata: "{\"assistant_id\": \"3b267431-d910-43e1-8f5e-68b6e3314032\", \"account_id\": \"16cc7902-f71c-4bb5-bbc6-2a8287392aa1\"}",
    agent_name: 'cs-au-dev',
    state: {
        status: 'JS_RUNNING',
        started_at: 1746164439740261262,
        updated_at: 1746164439740261262
    },
    level: 'INFO',
    name: 'ai-host',
    pid: 19,
    job_id: 'AJ_RoX89BPazvGZ',
    timestamp: '2025-05-02T05:40:39.745988+00:00'
}

const finalLog = {
    session_id: "uuid",
    container_id: "uuid",
    is_final: true, // true or false
    event_type: "info", // "info", "error", "warning", "debug"
    message: "Session finished", // message to display in the UI
    account_id: "uuid", // used for API validation, not stored in db
    assistant_id: "uuid", // primary assistant for the session
    event_data: {
        type: "session_finish", // event type, 'sip_joined_room', 'assistant_joined_room', 'user_joined_room', 'session_finish'
        lk_job_id: '', // job id
        rooms: { // rooms in the session
            "RM_xeoWCNNcjAH7": { "name": 'cs-au-dev-_anonymous_RnhMEKE9c3tw' },
            "RM_xeoWCNNcjAH7": { "name": 'cs-au-dev-_anonymous_RnhMEKE9c3tw' }
        },
        aias: { // aias in the session
            "9ac50dc3-4509-4f37-9e7c-1157dfcc8b98": { "name": "Alex" },
            "9ac50dc3-4509-4f37-9e7c-1157dfcc8b98": { "name": "Mike" }
        },
        users: { // users in the session
            "7b23e5d1-9f4c-48a6-bc3e-271df60a85f2": { "name": "Lisa Reynolds", "extension": { "id": "8c4f9a2e-6d17-42b5-9e38-57c02d7b9a13", "display_name": "Lisa Reynolds", "sip_username": "61298765432" } },
            "3e9a27f4-5d81-4c6b-b3a2-18ef49c7d085": { "name": "Marcus Chen", "extension": { "id": "f2a5c619-7e83-40d1-b54f-93c8e7b6d241", "display_name": "Marcus Chen", "sip_username": "61287654321" } },
            "9d5b6c3a-2e7f-4a18-90d5-1c4f8e3b7d92": { "name": "Sarah Johnson", "extension": { "id": "1e4d7c2a-8f6b-45e3-a9d7-62b5f3c8e901", "display_name": "Sarah Johnson", "sip_username": "61276543210" } }
        },
        contacts: { // contacts in the session
            "9ac50dc3-4509-4f37-9e7c-1157dfcc8b98": { "name": "Alex", "contacts": [{ "type": "phone", "number": "(962) 293-7982" }, { "type": "email", "email": "hup@ni.mv" }] },
            "9ac50dc3-4509-4f37-9e7c-1157dfcc8b98": { "name": "Mike", "contacts": [{ "type": "phone", "number": "(962) 293-7982" }, { "type": "email", "email": "hup@ni.mv" }] }
        },
        jobs: { // jobs created in the session
            "9ac50dc3-4509-4f37-9e7c-1157dfcc8b98": { "description": "Created a Job to call Contact tomorrow at 8am", "date": "2025-05-03", "time": "08:00:00" },
            "9ac50dc3-4509-4f37-9e7c-1157dfcc8b98": { "description": "Created a Job to SMS the User to remind them about their appointment at 8am", "date": "2025-05-03", "time": "08:00:00" },
            "9ac50dc3-4509-4f37-9e7c-1157dfcc8b98": { "description": "Created a Job to Email the Contact a summary of our conversation immediately after the call", "date": "2025-05-03", "time": "08:00:00" }
        },
        sip: { // sip calls in the session
            call_id: {
                call_status: sip_call_status,
                phone_number: sip_phone_number,
                trunk_phone_number: sip_trunk_phone_number,
                hostname: sip_hostname,
                rule_id: sip_rule_id,
                trunk_id: sip_trunk_id,
                call_id_full: sip_call_id_full
            }
        },
        ai: { // ai related data and metrics
          llm_prompt_tokens: 2176,
          llm_prompt_cached_tokens: 0,
          llm_completion_tokens: 100,
          tts_characters_count: 374,
          stt_audio_duration: 29.84999999999994
        }
    }
}

const errorLog = {
    session_id: "uuid",
    container_id: "uuid",
    is_final: false, // true or false
    event_type: "error", // "info", "error", "warning", "debug"
    message: "Experienced error accessing the Skill: 'skill_name'", // message to display in the UI
    account_id: "uuid", // used for API validation, not stored in db
    assistant_id: "uuid", // primary assistant for the session
    event_data: {
        type: "skill_error", // event type, 'sip_joined_room', 'assistant_joined_room', 'user_joined_room', 'session_finish'
        skill_id: 'uuid', // skill id
        skill_name: 'skill_name', // skill name
        parameters: 'parameters', // parameters that caused the error
        error: 'error message', // error message
    }
}

const newParticipant = {
    session_id: "uuid",
    container_id: "uuid",
    is_final: false, // true or false
    event_type: "info", // "info", "error", "warning", "debug"
    message: "New Contact joined the session", // message to display in the UI
    account_id: "uuid", // used for API validation, not stored in db
    assistant_id: "uuid", // primary assistant for the session
    event_data: {
        type: "sip_joined_room", // event type, 'sip_joined_room', 'assistant_joined_room', 'user_joined_room', 'session_finish'
        room: {
            room_id: 'uuid', // room id
            room_name: 'room_name', // room name
        },
        contact: {
            contact_id: 'uuid', // contact id
            contact_name: 'contact_name', // contact name
            contact_type: 'contact_type', // contact type
        },
        sip: { // sip related data
            call_id: {
                call_status: '',
                phone_number: '',
                trunk_phone_number: '',
                hostname: '',
                rule_id: '',
                trunk_id: '',
                call_id_full: ''
            }
        }
    }
}