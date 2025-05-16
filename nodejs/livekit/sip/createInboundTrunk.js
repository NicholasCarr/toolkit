import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const sipClient = new SipClient(process.env.LIVEKIT_URL,
                                process.env.LIVEKIT_API_KEY,
                                process.env.LIVEKIT_API_SECRET);

// An array of one or more provider phone numbers associated with the trunk.
// const numbers = ['+61240675894']; // telnyx
// const numbers = ['+61485939606'];  // over the wire
// const numbers = ['+13322200832'];
// const numbers = ['+447457410290'];
// const name = 'aue-shared-001-otw-in';
// const name = 'cs-us-sip-in-dev';
// const name = 'cs-uk-sip-in-dev';


// BUZZTRAIL
// const numbers = ['+61291374190'];  // TELNYX
// const numbers = ['+61291374170'];  // TELNYX
// const numbers = [ '+13239967890' ];  // TELNYX
// const numbers = [ '+13233288488' ];  // TELNYX
// const numbers = [ '+13233002360' ];  // TELNYX
// const numbers = [ '+442046204340'];  // TELNYX
const numbers = [ '+442046204230' ];  // TELNYX
const name = '442046204230-sip-in';

// Trunk options
const trunkOptions = {
  krispEnabled: true,
};

const trunk = await sipClient.createSipInboundTrunk(
  name,
  numbers,
  trunkOptions,
);

console.log(trunk);