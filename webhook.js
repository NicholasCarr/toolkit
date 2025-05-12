import short from 'short-uuid';
import crypto from 'crypto';

const translator = short(); // Create a translator instance
const uuid = crypto.randomUUID(); // Generate a UUID
console.log('UUID:', uuid);
const shortUuid = translator.fromUUID(uuid);
console.log('Short UUID:', shortUuid);
let lowercaseShortUuid = shortUuid.toLowerCase();
console.log('Lowercase Short UUID:', lowercaseShortUuid);
const originalUuid = translator.toUUID(lowercaseShortUuid);
console.log('Original UUID:', originalUuid);