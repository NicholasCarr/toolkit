import fs from 'fs';
import cdrDb from "../dbPools/cdrDb.js";
import {getExtensionByNumber} from "./central.js";

// Legacy - Get single cdr by linked_id
export async function getLegacyCdr(database, linked_id) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * 
        FROM ${database + '.cdr'}
        WHERE linked_id = '${linked_id}';`;
        cdrDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Get single cdr by linked_id
export async function getLegacyCel(database, linkedid) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * 
        FROM ${database + '.cel_202503'}
        WHERE linkedid = '${linkedid}';`;
        cdrDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

async function processCel(database, linkedId, environment_id) {
    // // CHECK IF CEL\CDR ALREADY PROCESSED
    // const checkCelRes = await celDb.checkCdr(linkedId);
    // if (checkCelRes.status === 'success' && checkCelRes.cdr >= 1) {
    //     return ({
    //         status: 'success',
    //         message: `CEL ${linkedId} already processed`,
    //     });
    // }
    const cels = await getLegacyCel(database, linkedId);
    if (cels.length === 0) {
        return ({
            status: 'error',
            message: `Unable to locate CEL events for ${linkedId}`,
        });
    } if (cels?.status === 'error') {
        return (cels);
    }
    let numbers = new Set();
    // eslint-disable-next-line no-restricted-syntax
    for (const cel of cels) {
        const extra = JSON.parse(cel.extra || '{}');
        const { pickup_channel: pc, transfer_target_channel_name: ttcn, extension } = extra;

        // eslint-disable-next-line no-restricted-globals
        const numbersFromAppData = cel.appdata.split(',').filter((str) => !isNaN(str)).map(Number);

        numbers.add(extension);
        numbers.add(cel.cid_num);
        if (pc) {
            const pcSplit = pc.split('/');
            if (pcSplit.length > 1) {
                numbers.add(pcSplit[1].split('-')[0]);
            }
        }
        if (ttcn) {
            const ttcnSplit = ttcn.split('/');
            if (ttcnSplit.length > 1) {
                numbers.add(ttcnSplit[1].split('-')[0]);
            }
        }
        const channameMatch = (cel.channame || '').match(/\/(\d{3,})-/);
        if (channameMatch) {
            numbers.add(channameMatch[1]);
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const number of numbersFromAppData) {
            numbers.add(number);
        }
    }

    numbers = Array.from(numbers).filter(Boolean);

    const extensions = numbers.length ? await getExtensionByNumber(numbers) : [];

    const getExtensionName = (number) => extensions.find(({ sip_username }) => sip_username === number)?.display_name || '';

    // PROCESS CELS INTO CDRS
    const cdr = {
        environment_id,
        linked_id: linkedId,
        disposition: 'NO ANSWER',
        answered: [],
        groups: [],
        events: [],
        qos: {},
    };

    let callStartCount = 0;
    let queueCount = 0;
    let pickupSource;
    let memberAnswer;

    // GET CALL START, DIRECTION & QOS
    for (let i = 0; i < cels.length; i++) {
        if ((cels[i].eventtype === 'INCOMING_CALL_START' && callStartCount === 0) || (cels[i].eventtype === 'OUTGOING_CALL_START' && callStartCount === 0) || cels[i].eventtype === 'FEATURE_CODE') {
            cdr.account_id = cels[i].accountcode;
            cdr.trunk_id = cels[i].appdata.split(',')[2];
            cdr.start = cels[i].eventtime;
            cdr.src_channel = cels[i].channame;
            cdr.src_did = cels[i].cid_num;
            cdr.src_name = cels[i].cid_name;
            callStartCount++;
            if (cels[i].exten === 's') {
                cdr.dst_did = cels[i].channame.split('/')[1].split('-')[0]; // OUTBOUND - THIS IS WRONG, LUCKILY OUTGOING_CID OVERWRITES THIS
            } else {
                cdr.dst_did = cels[i].exten; // OUTBOUND - THIS WILL ALWAYS BE S DUE TO CEL_SETTINGS
            }
        }
        if (cels[i].eventtype === 'INCOMING_CALL_START') {
            cdr.direction = 'INCOMING';
        }
        if (cels[i].eventtype === 'OUTGOING_CALL_START') {
            cdr.direction = 'OUTGOING';
            if (cels[i].exten === 's') {
                cdr.dst_did = cels[i].channame.split('/')[1].split('-')[0]; // THIS IS WRONG, LUCKILY OUTGOING_CID OVERWRITES THIS
            } else {
                cdr.dst_did = cels[i].exten; // THIS WILL ALWAYS BE S DUE TO CEL_SETTINGS
            }
        }
        if (cels[i].eventtype === 'FEATURE_CODE') {
            cdr.direction = 'FEATURE_CODE';
        }
        if (cels[i].eventtype === 'OUTGOING_CID') {
            cdr.dst_did = cels[i].exten;
            cdr.src_clid = cels[i].appdata.split(',')[1];
        }
        if (cels[i].eventtype === 'QOS_RTT') {
            // "QOS_RTT,0.136245,0.132736,0.143157,0.136033,0.002911"
            let rtt = {
                "rtt": cels[i].appdata.split(',')[1],
                "min_rtt": cels[i].appdata.split(',')[2],
                "max_rtt": cels[i].appdata.split(',')[3],
                "normdev_rtt": cels[i].appdata.split(',')[4],
                "stdev_rtt": cels[i].appdata.split(',')[5],
            }
            cdr.qos.rtt = rtt;
        }
        if (cels[i].eventtype === 'QOS_JTR') {
            //   "QOS_JTR,0.000000,0.002723,0.000048,0.007103,0.001354,0.000782,38.000000,27.000000,32.300000,3.226453"
            let jitter = {
                "rx_jitter": cels[i].appdata.split(',')[1],
                "tx_jitter": cels[i].appdata.split(',')[2],
                "local_min_jitter": cels[i].appdata.split(',')[3],
                "local_max_jitter": cels[i].appdata.split(',')[4],
                "local_normdev_jitter": cels[i].appdata.split(',')[5],
                "local_stdev_jitter": cels[i].appdata.split(',')[6],
                "remote_max_jitter": cels[i].appdata.split(',')[7],
                "remote_min_jitter": cels[i].appdata.split(',')[8],
                "remote_normdev_jitter": cels[i].appdata.split(',')[9],
                "remote_stdev_jitter": cels[i].appdata.split(',')[10],
            }
            cdr.qos.jitter = jitter;
        }
        if (cels[i].eventtype === 'QOS_PKT') {
            //   "QOS_PKT,2535,2548,1,1,0.000000,1.000000,0.600000,0.489898,1.000000,1.000000,0.100000,0.300000"
            let pkt = {
                "rx_count": cels[i].appdata.split(',')[1],
                "tx_count": cels[i].appdata.split(',')[2],
                "tx_ploss": cels[i].appdata.split(',')[3],
                "rx_ploss": cels[i].appdata.split(',')[4],
                "remote_min_rx_ploss": cels[i].appdata.split(',')[5],
                "remote_max_rx_ploss": cels[i].appdata.split(',')[6],
                "remote_normdev_rx_ploss": cels[i].appdata.split(',')[7],
                "remote_stdev_rx_ploss": cels[i].appdata.split(',')[8],
                "local_min_rx_ploss": cels[i].appdata.split(',')[9],
                "local_max_rx_ploss": cels[i].appdata.split(',')[10],
                "local_normdev_rx_ploss": cels[i].appdata.split(',')[11],
                "local_stdev_rx_ploss": cels[i].appdata.split(',')[12],
            }
            cdr.qos.pkt = pkt;
        }
    }
    if (!cdr.account_id) return ({
        status: 'skip',
        message: 'Early notification, skipping CDR processing',
    });
    // PROCESS EVENTS
    for (let i = 0; i < cels.length; i++) {
        // DIALPLAN BASED CALL PICKUP
        if (cels[i].eventtype === 'PICKUP') {
            // AVAILABLE FOR ATTENDED TRANSFER VIA YEALINK DROPPING PICKED UP EXTEN
            pickupSource = cels[i].channame.split('/')[1].split('-')[0];
            if (cdr.disposition === 'NO ANSWER') {
                cdr.disposition = 'PICKED UP';
            }
            if (!cdr.answer) {
                cdr.answer = cels[i].eventtime;
            }
            if (!cdr.ring_sec) {
                cdr.ring_sec = moment(cdr.answer).diff(moment(cdr.start), 'seconds');
            }
            cdr.answered.push({
                did: JSON.parse(cels[i].extra).pickup_channel.split('/')[1].split('-')[0],
                name: getExtensionName(JSON.parse(cels[i].extra).pickup_channel.split('/')[1].split('-')[0]),
            });
            cdr.events.push({
                time: cels[i].eventtime,
                type: cels[i].eventtype,
                pickup_by: JSON.parse(cels[i].extra).pickup_channel.split('/')[1].split('-')[0],
                pickup_by_name: getExtensionName(JSON.parse(cels[i].extra).pickup_channel.split('/')[1].split('-')[0]),
            });
        }
        // ANSWER HANDLERS
        if (cdr.direction === 'INCOMING' && cels[i].eventtype === 'ANSWER' && cdr.src_channel === cels[i].channame && cdr.disposition !== 'PICKED UP' && cels[i].context !== 'queues') {
            // INCOMING CHANNEL MATCH SOURCE
            // IGNORES CHANNEL ANSWERED VIA QUEUE
            // IGNORES CHANNEL ANSWERED VIA PICKUP
            let cid_name;
            if (cels[i].cid_num === cels[i].cid_name || !cels[i].cid_name) {
                cid_name = getExtensionName(cels[i].cid_num);
            } else {
                cid_name = cels[i].cid_name;
            }
            cdr.answered.push({
                did: cels[i].cid_num,
                name: cid_name,
            });
            if (cdr.disposition === 'NO ANSWER') {
                cdr.disposition = 'ANSWERED';
            }
            if (!cdr.answer) {
                cdr.answer = cels[i].eventtime;
            }
            if (!cdr.ring_sec) {
                cdr.ring_sec = moment(cdr.answer).diff(moment(cdr.start), 'seconds');
            }
            cdr.events.push({
                time: cels[i].eventtime,
                type: cdr.disposition.toUpperCase(),
                by: cels[i].cid_num,
                by_name: cid_name,
            });
        } else if ((cdr.direction === 'OUTGOING' || cdr.direction === 'INTERNAL') && cels[i].eventtype === 'ANSWER' && cdr.src_channel === cels[i].channame) {
            // ANSWER - OUTGOING ORIGINATE CHANNEL
            cdr.answered.push({
                did: cels[i].cid_num,
                name: cels[i].cid_name,
            });
            cdr.events.push({
                time: cels[i].eventtime,
                type: 'ANSWERED',
                by: cels[i].cid_num,
                by_name: cels[i].cid_name,
            });
        } else if ((cdr.direction === 'OUTGOING' || cdr.direction === 'INTERNAL') && cels[i].eventtype === 'ANSWER' && cdr.src_channel !== cels[i].channame) {
            // ANSWER - OUTGOING NON ORIGINATING CHANNEL
            if (cdr.disposition === 'NO ANSWER') {
                cdr.disposition = 'ANSWERED';
            }
            if (!cdr.answer) {
                cdr.answer = cels[i].eventtime;
            }
            if (!cdr.ring_sec) {
                cdr.ring_sec = moment(cdr.answer).diff(moment(cdr.start), 'seconds');
            }
            cdr.answered.push({
                did: cdr.dst_did,
                name: cdr.dst_name,
            });
            cdr.events.push({
                time: cels[i].eventtime,
                type: 'ANSWERED',
                by: cdr.dst_did,
                by_name: cdr.dst_name,
            });
        } else if (cels[i].eventtype === 'ANSWER' && (cels[i].context !== 'member' && cels[i].context !== 'ivr' && cels[i].context !== 'default' && cels[i].context !== 'queues' && cels[i].context !== 'transfer')) {
            // ANSWER - NONE ORIGINATING CHANNELS
            // IGNORE GROUP, GROUP MEMBERS, IVR\ATTENDANTS & TRANSFER CONTEXTS
            // IGNORE DEFAULT CONTEXT FOR FORWARDED CALLS
            // IGNORE ANSWERED BY ORIGINATING CHANNEL
            const cid_num = cels[i].channame.split('/')[1].split('-')[0];
            const cid_name = getExtensionName(cid_num);
            cdr.answered.push({
                did: cid_num,
                name: cid_name,
            });
            cdr.events.push({
                time: cels[i].eventtime,
                type: 'ANSWERED',
                by: cid_num,
                by_name: cid_name,
            });
        }

        // ANSWER - CALLSMART EXTENSION                                     //  NO LONGER NEEDED, TO BE RETIRED
        if (cels[i].eventtype === 'BRIDGE_ENTER' && cdr.src_channel !== cels[i].channame && cels[i].appname === 'Stasis' && cels[i].context === cdr.trunk_id) {
            // IGNORE ANSWERED BY ORIGINATING CHANNEL
            const cid_num = cels[i].channame.split('/')[1].split('-')[0];
            const cid_name = getExtensionName(cid_num);
            cdr.answered.push({
                did: cid_num,
                name: cid_name,
            });
            cdr.events.push({
                time: cels[i].eventtime,
                type: 'ANSWERED',
                by: cid_num,
                by_name: cid_name,
            });
        }

        // ATTENDED TRANSFER
        if (cels[i].eventtype === 'ATTENDEDTRANSFER') {
            // DUE TO YEALINK MARKING BLF TRANSFERS AS ATTENDED TRANSFERS
            let transferred_to;
            let transfer_eventtype;
            let transferred_to_name;
            if (JSON.parse(cels[i].extra).transfer_target_channel_name === 'N/A') {
                transfer_eventtype = 'BLINDTRANSFER';
                transferred_to = pickupSource;
                transferred_to_name = getExtensionName(transferred_to);
            } else {
                transfer_eventtype = 'ATTENDEDTRANSFER';
                transferred_to = JSON.parse(cels[i].extra).transfer_target_channel_name.split('/')[1].split('-')[0];
                transferred_to_name = getExtensionName(transferred_to);
            }
            if (!transferred_to_name) {
                transferred_to = 'EXTERNAL';
                transferred_to_name = 'EXTERNAL';
            }
            cdr.answered.push({
                did: transferred_to,
                name: transferred_to_name,
            });
            cdr.events.push({
                time: cels[i].eventtime,
                type: transfer_eventtype,
                transferred_from: cels[i].cid_num,
                transferred_from_name: getExtensionName(cels[i].cid_num),
                transferred_to,
                transferred_to_name,
            });
        }
        // BLIND TRANSFER
        if (cels[i].eventtype === 'BLINDTRANSFER') {
            const transferred_to = JSON.parse(cels[i].extra).extension;
            const transferred_to_name = getExtensionName(JSON.parse(cels[i].extra).extension);
            cdr.events.push({
                time: cels[i].eventtime,
                type: cels[i].eventtype,
                transferred_from: cels[i].cid_num,
                transferred_to,
                transferred_to_name,
            });
        }
        // SOURCE CHANNEL HANGUP HANDLER
        // IGNORE GROUP & GROUP MEMBERS RING\HANGUP
        if (cels[i].eventtype === 'HANGUP' && cdr.src_channel === cels[i].channame && cels[i].context !== 'member') {
            cdr.end = cels[i].eventtime;
            cdr.duration = moment(cdr.end).diff(moment(cdr.start), 'seconds');
            if (cdr.disposition === 'NO ANSWER') {
                cdr.bill_sec = 0;
                cdr.ring_sec = cdr.duration;
            } else {
                cdr.bill_sec = cdr.duration - cdr.ring_sec;
            }
            cdr.events.push({
                time: cels[i].eventtime,
                type: cels[i].eventtype,
                by: cels[i].cid_name,
                by_name: cels[i].cid_num,
            });
        }
        // HANGUP HANDLER - NONE ORIGINATING CHANNELS
        // IGNORE NONE ANSWERING GROUP MEMBERS HANGUP
        if (cels[i].eventtype === 'HANGUP' && cdr.src_channel !== cels[i].channame && memberAnswer === cels[i].channame) {
            // const hangupsource = JSON.parse(cels[i].extra).hangupsource.split('/')[1].split('-')[0];
            cdr.events.push({
                time: cels[i].eventtime,
                type: cels[i].eventtype,
                by: cels[i].cid_name,
                by_name: cels[i].cid_num,
            });
        }

        // CUSTOM EVENTS HANDLERS
        if (cels[i].appname === 'CELGenUserEvent' && cdr.src_channel === cels[i].channame) {
            if (cels[i].eventtype === 'INTERNAL_CALL') {
                cdr.direction = 'INTERNAL';
                cdr.dst_did = cels[i].appdata.split(',')[2];
                cdr.dst_name = getExtensionName(cels[i].appdata.split(',')[3]);
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'INTERNAL',
                    from: cels[i].appdata.split(',')[1],
                    from_name: getExtensionName(cels[i].appdata.split(',')[1]),
                    to: cels[i].appdata.split(',')[3],
                    to_name: cdr.dst_name,
                });
            }
            if (cels[i].eventtype === 'EXTERNAL_CALL') {
                cdr.dst_did = cels[i].appdata.split(',')[2];
                cdr.dst_name = getExtensionName(cels[i].appdata.split(',')[2]);
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'EXTERNAL',
                    from: cels[i].appdata.split(',')[1],
                    from_name: getExtensionName(cels[i].appdata.split(',')[1]),
                    to: cdr.dst_did,
                    to_name: cdr.dst_name,
                });
            }
            if (cels[i].eventtype === 'ROUTED_TO') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'ROUTED_TO',
                    dst_type: cels[i].appdata.split(',')[1].toUpperCase(),
                    dst_id: cels[i].appdata.split(',')[2],
                });
            }
            if (cels[i].eventtype === 'NUMBER_NOT_IN_SERVICE') {
                cdr.disposition = 'NOT IN SERVICE';
                if (!cdr.answer) {
                    cdr.answer = cels[i].eventtime;
                }
                if (!cdr.ring_sec) {
                    cdr.ring_sec = moment(cdr.answer).diff(moment(cdr.start), 'seconds');
                }
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'NOT_IN_SERVICE',
                    number: cels[i].appdata.split(',')[1],
                });
            }
            if (cels[i].eventtype === 'ANNOUNCEMENT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: cels[i].eventtype,
                    id: cels[i].appdata.split(',')[1],
                    name: cels[i].appdata.split(',')[2],
                });
            }
            if (cels[i].eventtype === 'ATTENDANT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: cels[i].eventtype,
                    id: cels[i].appdata.split(',')[1],
                    name: cels[i].appdata.split(',')[2],
                });
            }
            if (cels[i].eventtype === 'ATTENDANT_NO_INPUT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'ATTENDANT',
                    status: 'NO INPUT',
                    id: cels[i].appdata.split(',')[1],
                    no_input: cels[i].appdata.split(',')[2],
                });
            }
            if (cels[i].eventtype === 'ATTENDANT_KEY_VALID') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'ATTENDANT',
                    status: 'VALID KEY PRESS',
                    id: cels[i].appdata.split(',')[1],
                    key_pressed: cels[i].appdata.split(',')[2],
                    attempt: cels[i].appdata.split(',')[3],
                });
            }
            if (cels[i].eventtype === 'ATTENDANT_KEY_INVALID') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'ATTENDANT',
                    status: 'INVALID KEY PRESS',
                    id: cels[i].appdata.split(',')[1],
                    key_pressed: cels[i].appdata.split(',')[2],
                    attempt: cels[i].appdata.split(',')[3],
                });
            }
            if (cels[i].eventtype === 'TIME_CONDITION_MATCH') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'TIME_CONDITION',
                    status: 'MATCH',
                    id: cels[i].appdata.split(',')[1],
                    name: cels[i].appdata.split(',')[2],
                });
            }
            if (cels[i].eventtype === 'TIME_CONDITION_NOMATCH') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'TIME_CONDITION',
                    status: 'NO MATCH',
                    id: cels[i].appdata.split(',')[1],
                    name: cels[i].appdata.split(',')[2],
                });
            }
            if (cels[i].eventtype === 'GROUP') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: cels[i].eventtype,
                    id: cels[i].appdata.split(',')[1],
                    name: cels[i].appdata.split(',')[2],
                    label: cels[i].appdata.split(',')[3],
                });
                cdr.groups.splice(cels[i].appdata.split(',')[1], 0, {
                    time: cels[i].eventtime,
                    id: cels[i].appdata.split(',')[1],
                    name: cels[i].appdata.split(',')[2],
                    label: cels[i].appdata.split(',')[3],
                    members: [],
                });
                queueCount++;
            }
            if (cels[i].eventtype === 'GROUP_TIMEOUT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: cels[i].eventtype,
                    id: cels[i].appdata.split(',')[1],
                    alt_type: cels[i].appdata.split(',')[2],
                    alt_dest: cels[i].appdata.split(',')[3],
                });
            }
            if (cels[i].eventtype === 'GROUP_CALLSMART_START') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: cels[i].eventtype,
                    id: cels[i].appdata.split(',')[1],
                    name: cels[i].appdata.split(',')[2],
                    label: cels[i].appdata.split(',')[3],
                });
            }
            if (cels[i].eventtype === 'GROUP_CALLSMART_EXIT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: cels[i].eventtype,
                    id: cels[i].appdata.split(',')[1],
                    name: cels[i].appdata.split(',')[2],
                    label: cels[i].appdata.split(',')[3],
                });
            }
            if (cels[i].eventtype === 'EXTENSION') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: cels[i].eventtype,
                    id: cels[i].appdata.split(',')[1],
                    name: getExtensionName(cels[i].appdata.split(',')[1]),
                    ext_status: cels[i].appdata.split(',')[2],
                    alt_dest: cels[i].appdata.split(',')[3], // 0 = no, 1 = yes - ${extension_time_out_enabled}
                    call_waiting: cels[i].appdata.split(',')[4], // 0 = no, 1 = yes - ${call_waiting}
                    dnd: cels[i].appdata.split(',')[5], // 0 = no, 1 = yes - ${dnd_enabled}
                    cfw_a: cels[i].appdata.split(',')[6], // 0 = no, 1 = yes -  ${cfw_a}
                    cfw_bna: cels[i].appdata.split(',')[7], // 0 = no, 1 = yes -  ${cfw_bna}
                    callsmart: cels[i].appdata.split(',')[8], // 0 = no, 1 = yes - ${callsmart_status}
                    call_rec: cels[i].appdata.split(',')[9], // 0 = no, 1 = ondemand, 2 = always - ${call_recording}
                    vm: cels[i].appdata.split(',')[10], // 0 = no, 1 = yes - ${voicemail_enabled}
                });
            }
            if (cels[i].eventtype === 'EXTENSION_ALT_DEST') {
                let dst;
                if (cels[i].appdata.split(',')[1] === 'direct_extension') {
                    dst = 'EXTENSION';
                }
                if (cels[i].appdata.split(',')[1] === 'queues') {
                    dst = 'GROUP';
                }
                if (cels[i].appdata.split(',')[1] === 'time_condition') {
                    dst = 'TIME CONDITION';
                }
                if (cels[i].appdata.split(',')[1] === 'user_voicemail') {
                    dst = 'VOICEMAIL';
                }
                if (cels[i].appdata.split(',')[1] === 'announcement') {
                    dst = 'ANNOUNCEMENT';
                }
                if (cels[i].appdata.split(',')[1] === 'ivr') {
                    dst = 'ATTENDANT';
                }
                if (cels[i].appdata.split(',')[1] === 'call_forward') {
                    dst = 'CALL FORWARD';
                }
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'ALTERNATE_DESTINATION',
                    dst,
                });
            }
            // CALL FORWARD SET VIA MANAGER AS DESTINATION
            if (cels[i].eventtype === 'FWD_INT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD',
                    status: 'INTERNAL',
                    forward_to: cels[i].appdata.split(',')[1],
                });
            }
            // CALL FORWARD SET VIA MANAGER AS DESTINATION
            if (cels[i].eventtype === 'FWD_EXT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD',
                    status: 'EXTERNAL',
                    forward_to: cels[i].appdata.split(',')[1],
                });
            }
            if (cels[i].eventtype === 'VM_BUSY') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'VOICEMAIL',
                    status: 'BUSY',
                    mailbox: cels[i].appdata.split(',')[1],
                });
            }
            if (cels[i].eventtype === 'VM_UNAVAIL') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'VOICEMAIL',
                    status: 'UNAVAILABLE',
                    mailbox: cels[i].appdata.split(',')[1],
                });
            }
            // CALL FORWARD SET ON EXTENSION
            if (cels[i].eventtype === 'FWD_ALWAYS_INT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD',
                    status: 'ALWAYS INTERNAL',
                    forward_to: cels[i].appdata.split(',')[1],
                });
            }
            // CALL FORWARD SET ON EXTENSION
            if (cels[i].eventtype === 'FWD_ALWAYS_EXT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD',
                    status: 'ALWAYS EXTERNAL',
                    forward_to: cels[i].appdata.split(',')[1],
                });
            }
            // CALL FORWARD SET ON EXTENSION
            if (cels[i].eventtype === 'FWD_BUSY_INT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD',
                    status: 'BUSY INTERNAL',
                    forward_to: cels[i].appdata.split(',')[1],
                });
            }
            // CALL FORWARD SET ON EXTENSION
            if (cels[i].eventtype === 'FWD_BUSY_EXT') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD',
                    status: 'BUSY EXTERNAL',
                    forward_to: cels[i].appdata.split(',')[1],
                });
            }
            if (cels[i].eventtype === 'CALL_REC_ALWAYS') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_RECORDING',
                    status: 'ALWAYS',
                });
            }
            if (cels[i].eventtype === 'CALLSMART_START') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALLSMART',
                    status: 'START',
                });
            }
            if (cels[i].eventtype === 'CALLSMART_STOP') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALLSMART',
                    status: 'STOP',
                });
            }
            if (cels[i].eventtype === 'CALL_REC_START') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL RECORDING',
                    status: 'ON DEMAND START',
                    did: cels[i].appdata.split(',')[1],
                });
            }
            if (cels[i].eventtype === 'CALL_REC_STOP') {
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL RECORDING',
                    status: 'ON DEMAND STOP',
                    did: cels[i].appdata.split(',')[1],
                });
            }
        }

        // FEATURE CODE HANDLERS
        if (cdr.direction === 'FEATURE_CODE') {
            // VOICEMAIL PORTAL DIRECT VIA HANDSET
            if (cels[i].eventtype === 'VM_PORTAL') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'VOICEMAIL PORTAL';
                }
                cdr.dst_name = 'VOICEMAIL PORTAL';
                cdr.dst_did = '';
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'VOICEMAIL',
                    status: 'DIRECT',
                });
            }
            // VOICEMAIL PORTAL VIA HANDSET
            if (cels[i].eventtype === 'VM_MAIN_PORTAL') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'VOICEMAIL PORTAL';
                }
                cdr.dst_name = 'VOICEMAIL PORTAL';
                cdr.dst_did = '';
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'VOICEMAIL',
                    status: 'PORTAL',
                });
            }
            // DND VIA HANDSET
            if (cels[i].eventtype === 'DND_HANDSET_ON') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'DND ON';
                }
                cdr.dst_name = 'DND ON';
                cdr.dst_did = '';
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'DND',
                    status: 'ON',
                });
            }
            if (cels[i].eventtype === 'DND_HANDSET_OFF') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'DND OFF';
                }
                cdr.dst_name = 'DND OFF';
                cdr.dst_did = '';
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'DND',
                    status: 'OFF',
                });
            }
            // CALL FORWARD VIA HANDSET
            if (cels[i].eventtype === 'CFWA_HANDSET_ON') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'CALL FORWARD ON';
                }
                cdr.dst_name = 'CALL FORWARD ALWAYS ON';
                cdr.dst_did = cels[i].appdata.split(',')[2];
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD_ALWAYS',
                    status: 'ON',
                });
            }
            if (cels[i].eventtype === 'CFWA_HANDSET_OFF') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'CALL FORWARD OFF';
                }
                cdr.dst_name = 'CALL FORWARD ALWAYS OFF';
                cdr.dst_did = '';
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD_ALWAYS',
                    status: 'OFF',
                });
            }
            if (cels[i].eventtype === 'CFWBNA_HANDSET_ON') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'CALL FORWARD ON';
                }
                cdr.dst_name = 'CALL FORWARD BUSY ON';
                cdr.dst_did = cels[i].appdata.split(',')[2];
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD_BUSY',
                    status: 'ON',
                });
            }
            if (cels[i].eventtype === 'CFWBNA_HANDSET_OFF') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'CALL FORWARD OFF';
                }
                cdr.dst_name = 'CALL FORWARD BUSY OFF';
                cdr.dst_did = '';
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_FORWARD_BUSY',
                    status: 'OFF',
                });
            }
            // CALL PICKUP
            if (cels[i].eventtype === 'PICKUP_CALLSMART') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'PICK UP';
                }
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'PICK_UP',
                    dst_did: cels[i].appdata.split(',')[3],
                    status: 'VIA CALLSMART',
                });
            }
            if (cels[i].eventtype === 'PICKUP_DIRECT') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'PICK UP';
                }
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'PICK_UP',
                    dst_did: cels[i].appdata.split(',')[3],
                    status: 'DIRECT',
                });
            }
            // CALL SPY
            if (cels[i].eventtype === 'CALLSPY_START') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'CALL SPY';
                }
                cdr.dst_name = 'CALL SPY';
                cdr.dst_did = cels[i].appdata.split(',')[2];
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'CALL_SPY',
                    status: 'START LISTENING',
                    listen_from: cels[i].appdata.split(',')[1],
                    listen_from_name: getExtensionName(cels[i].appdata.split(',')[1]),
                    listen_to: cels[i].appdata.split(',')[2],
                    listen_to_name: getExtensionName(cels[i].appdata.split(',')[2]),
                });
            }
            // INTERCOM
            if (cels[i].eventtype === 'INTERCOM_START') {
                if (cdr.disposition === 'NO ANSWER') {
                    cdr.disposition = 'INTERCOM';
                }
                cdr.dst_name = 'INTERCOM';
                cdr.dst_did = cels[i].appdata.split(',')[2];
                cdr.ring_sec = 0;
                cdr.events.push({
                    time: cels[i].eventtime,
                    type: 'INTERCOM',
                    intercom_from: cels[i].appdata.split(',')[1],
                    intercom_from_name: getExtensionName(cels[i].appdata.split(',')[1]),
                    intercom_to: cels[i].appdata.split(',')[2],
                    intercom_to_name: getExtensionName(cels[i].appdata.split(',')[2]),
                });
            }
        }

        // GROUP MEMBERS - RING AVAILABLE (NON PAUSED)
        if (cels[i].appname === 'CELGenUserEvent' && cdr.src_channel !== cels[i].channame && cels[i].eventtype === 'GROUP_MEMBER') {
            cdr.groups[(queueCount - 1)].members.push({
                time: cels[i].eventtime,
                did: cels[i].appdata.split(',')[2],
                name: getExtensionName(cels[i].channame.split('/')[1].split('@')[0]),
            });
        }

        // GROUP - MEMBER ANSWERED
        if (cdr.direction === 'INCOMING' && cels[i].eventtype === 'ANSWER' && cels[i].context === 'member' && cels[i].appname === 'Dial') {
            memberAnswer = cels[i].channame;
            if (cdr.disposition === 'NO ANSWER') {
                cdr.disposition = 'ANSWERED';
            }
            if (!cdr.answer) {
                cdr.answer = cels[i].eventtime;
            }
            if (!cdr.ring_sec) {
                cdr.ring_sec = moment(cdr.answer).diff(moment(cdr.start), 'seconds');
            }
            // SEND ORIGINATING CALLER TO ANSWERED
            // IGNORES QUEUE ANSWER WHICH SKEWS RING TIME
            const cid_name = getExtensionName(cels[i].cid_num);
            cdr.answered.push({
                did: cels[i].cid_num,
                name: cid_name,
            });
        }
    }

    // console.log(cdr);
    return cdr;
    // const addCdrRes = await celDb.addCdr(cdr);
    // if (addCdrRes.status === 'success') {
    //     // await celDb.updateCelStatus(linkedId);
    //     return ({
    //         status: 'success',
    //         message: 'Processed CDR successfully',
    //     });
    // }
    // return ({
    //     status: 'warning',
    //     message: 'Unable to process CDR, contact support',
    // });
}

export async function getLegacyStaffReport(database, firmid, days) {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
          staffid,
          COUNT(*) AS total_calls,
          SUM(CASE WHEN disposition = 'answered' THEN 1 ELSE 0 END) AS answered_calls,
          ROUND((SUM(CASE WHEN disposition = 'answered' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS answer_rate,
          SUM(CASE WHEN matterid IS NOT NULL AND matterid != '' THEN 1 ELSE 0 END) AS allocated_calls,
          ROUND((SUM(CASE WHEN matterid IS NOT NULL AND matterid != '' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS allocation_rate,
          ROUND(AVG(billsec), 2) AS avg_call_duration_seconds,
          SUM(billsec) AS total_seconds,
          ROUND(SUM(billsec)/60, 2) AS total_minutes
        FROM ${database + '.cdr'}
        WHERE 
          firmid = '${firmid}'
          AND start >= DATE_SUB(CURDATE(), INTERVAL ${days || 7} DAY)
        GROUP BY staffid
        ORDER BY total_calls DESC`;
        cdrDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

export async function getLegacyAccountCallStats(database, account_id, days) {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
          linked_id,
          COUNT(*) AS total_calls,
          SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS answered_calls,
          ROUND((SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS answer_rate,
          ROUND(AVG(bill_sec), 2) AS avg_call_duration_seconds,
          SUM(bill_sec) AS total_seconds,
          ROUND(SUM(bill_sec)/60, 2) AS total_minutes
        FROM ${database + '.cdr'}
        WHERE 
          account_id = '${account_id}'
          AND start >= DATE_SUB(CURDATE(), INTERVAL ${days || 7} DAY)
        ORDER BY total_calls DESC`;
        cdrDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Get all calls for x days by account_id from legacy database
export async function getLegacyCalls(database, account_id, days) {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT * 
        FROM ${database + '.cdr'}
        WHERE 
          account_id = '${account_id}'
          AND start >= DATE_SUB(CURDATE(), INTERVAL ${days || 7} DAY)`;
        cdrDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// V2 
// Get all calls for x days by account_id
export async function getCalls(account_id, days) {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT * 
        FROM logs.cdr
        WHERE 
          account_id = '${account_id}'
          AND start >= DATE_SUB(CURDATE(), INTERVAL ${days || 7} DAY)`;
        cdrDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Get single cdr by linked_id
export async function getCdr(linked_id) {
    return new Promise((resolve, reject) => {
        const query = `SELECT src_name, src_did, dst_name, dst_did, direction, start, end, ring_sec, bill_sec, duration, events, qos 
        FROM logs.cdr 
        WHERE linked_id = '${linked_id}';`;
        cdrDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// const response = await getLegacyCel('aue_cpbx_001_cel', '1740953493.1199854')
// const response = await getLegacyCdr('aue_cpbx_001_cel', '1740953493.1199854')
const response = await processCel('aue_cpbx_001_cel','1740953493.1199854', '0f09e6fe-a652-443c-9988-57c61ffcade3')
console.log(response)
// console.log('length', response.length)

// fs.writeFileSync('./cdr.txt', JSON.stringify(response));
fs.writeFileSync('./processed.txt', JSON.stringify(response));
