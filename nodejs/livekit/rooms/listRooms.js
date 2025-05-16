import { Room, RoomServiceClient } from 'livekit-server-sdk';

import dotenv from 'dotenv';

dotenv.config();

const roomService = new RoomServiceClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);

roomService.listRooms().then((rooms) => {
    console.log('existing rooms', JSON.stringify(rooms));
});