import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const sipClient = new SipClient(process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET);

// SIP address is the hostname or IP the SIP INVITE is sent to.
// Address format for Twilio: <trunk-name>.pstn.twilio.com
// Address format for Telnyx: sip.telnyx.com
const address = 'sip.telnyx.com';
// const address = 'sip.netsip.net.au';

// const name = 'cs-au-sip-out-dev';
// const name = 'cs-us-sip-out-dev';
// const name = 'cs-uk-sip-out-dev';
// const name = 'aue-shared-001-telnyx-out';

// An array of one or more provider phone numbers associated with the trunk.
// const numbers = ['+61240675894'];
// const numbers = ['+13322200832'];
// const numbers = ['+447457410290'];
// const numbers = ['+61485939606'];  // over the wire

// BUZZTRAIL
// const numbers = ['+61291374170', '+61291374190'];  // TELNYX
// const numbers = ['+13239967890', '+13233002360', '+13233288488'];  // TELNYX
const numbers = ['+442046204230','+442046204340'];  // TELNYX
// const name = 'aue-buzztrail-001-sip-out';
// const name = 'use-buzztrail-001-sip-out';
const name = 'uks-buzztrail-001-sip-out';

// Trunk options
const trunkOptions = {
    authUsername: '3J9sea89D7HeHnNoBFLD',
    authPassword: 'YiKbsEKG2AKmsmzQCKCd'
};

const trunk = await sipClient.createSipOutboundTrunk(
    name,
    address,
    numbers,
    trunkOptions
);

console.log(trunk);