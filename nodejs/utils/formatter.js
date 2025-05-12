async function formatTimestamp(timestamp) {
    // Create a new Date object from the timestamp (convert seconds to milliseconds)
    const date = new Date(timestamp * 1000);

    // Extract components
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year

    // Format the string
    return `${hours}:${minutes} ${day}/${month}/${year}`;
}

async function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "Invalid input";
    }

    // Convert to integer to avoid floating point precision issues
    const totalSeconds = Math.floor(seconds);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    let result = "";

    if (hours > 0) {
        result += hours + " hours, ";
    }

    if (minutes > 0) {
        result += minutes + " mins, ";
    }

    result += remainingSeconds + " sec";

    return result;
}

async function formatUtcToAEST(utcTimestamp) {
    // Parse the UTC timestamp
    const date = new Date(utcTimestamp);

    // Convert to AEST (UTC+10 or UTC+11 depending on daylight saving)
    // We'll use the built-in toLocaleString method with the Australia/Sydney timezone
    const aestOptions = {
        timeZone: 'Australia/Sydney',
        hour: 'numeric',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false // Use 24-hour format
    };

    // Format using toLocaleString
    const formattedDateTime = date.toLocaleString('en-AU', aestOptions);

    // Convert from "23/12/2024, 15:52" to "15:52 23/12/2024"
    const [datePart, timePart] = formattedDateTime.split(', ');
    return `${timePart} ${datePart}`;
}

async function toTitleCase(str) {
    // Check if the string exists and has length
    if (!str || str.length === 0) return str;
    // Convert to lowercase first, then capitalize first letter
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function cleanEvents(events) {
    // Helper function to check if a string looks like a UUID
    const isUUID = (str) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };
  
    // Helper function to map status values
    const mapStatus = (status) => {
      switch (status) {
        case 'NOT_INUSE': return 'available';
        case 'INUSE': return 'busy';
        case 'OFFLINE': return 'offline';
        case 'UNAVAILABLE': return 'unavailable';
        case 'RINGING': return 'ringing';
        default: return status;
      }
    };
  
    // Helper function to map binary values to enabled/disabled
    const binaryToEnabledDisabled = (value) => {
      if (value === "1") return 'enabled';
      return 'disabled';
    };
  
    // Helper function to map call recording values
    const mapCallRecording = (value) => {
      switch (value) {
        case "0": return 'disabled';
        case "1": return 'on_demand';
        case "2": return 'always';
        default: return value;
      }
    };
  
    return events
      .map(event => {
        const newEvent = { ...event };
        
        // Remove UUID ids
        if (newEvent.id && isUUID(newEvent.id)) {
          delete newEvent.id;
        }
        
        if (newEvent.dst_id) {
          delete newEvent.dst_id;
        }
        
        // Handle EXTENSION type events
        if (newEvent.type === "EXTENSION") {
          if ('vm' in newEvent) {
            newEvent.voicemail = binaryToEnabledDisabled(newEvent.vm);
            delete newEvent.vm;
          }
          
          if ('dnd' in newEvent) {
            newEvent.do_not_disturb = binaryToEnabledDisabled(newEvent.dnd);
            delete newEvent.dnd;
          }
          
          if ('cfw_a' in newEvent) {
            newEvent.call_forward_always = binaryToEnabledDisabled(newEvent.cfw_a);
            delete newEvent.cfw_a;
          }
          
          if ('cfw_bna' in newEvent) {
            newEvent.call_forward_busy = binaryToEnabledDisabled(newEvent.cfw_bna);
            delete newEvent.cfw_bna;
          }
          
          if ('alt_dest' in newEvent) {
            newEvent.alternate_destination = binaryToEnabledDisabled(newEvent.alt_dest);
            delete newEvent.alt_dest;
          }
          
          if ('call_rec' in newEvent) {
            newEvent.call_recording = mapCallRecording(newEvent.call_rec);
            delete newEvent.call_rec;
          }
          
          if ('callsmart' in newEvent) {
            newEvent.callsmart = (newEvent.callsmart === "1") ? 'enabled' : 'disabled';
            delete newEvent.callsmart;
          }
          
          if ('ext_status' in newEvent) {
            newEvent.status = mapStatus(newEvent.ext_status);
            delete newEvent.ext_status;
          }
          
          if ('call_waiting' in newEvent) {
            newEvent.call_waiting = binaryToEnabledDisabled(newEvent.call_waiting);
          }
        }
        
        return newEvent;
      })
      .sort((a, b) => new Date(a.time) - new Date(b.time)) // Sort by time
      .map(event => {
        // Ensure time is the first property in each object
        const { time, ...rest } = event;
        return { time, ...rest };
      });
  }

[
    { "by": "61290982914", "time": "2024-12-23 04:52:45.554671", "type": "ANSWERED" }, 
    { "by": "61290982914", "time": "2024-12-23 04:52:45.558721", "type": "ANSWERED", "by_name": "61290982914" }, 
    { "id": "61290982913", "vm": "1", "dnd": "0", "name": "Michael Szafran", "time": "2024-12-23 04:52:40.354597", "type": "EXTENSION", "cfw_a": "0", "cfw_bna": "0", "alt_dest": "0", "call_rec": "2", "callsmart": "", "ext_status": "NOT_INUSE", "call_waiting": "1" }, 
    { "by": "61290982914", "time": "2024-12-23 04:53:35.350353", "type": "HANGUP", "by_name": "61290982914" }, 
    { "to": "61290982913", "from": "61290982914", "time": "2024-12-23 04:52:39.220939", "type": "INTERNAL", "to_name": "Michael Szafran", "from_name": "Paul Oriel" }, 
    { "time": "2024-12-23 04:52:39.220980", "type": "ROUTED_TO", "dst_id": "61290982913", "dst_type": "EXTENSION" }
]

[
    { "time": "2024-04-08 23:20:37.897962", "type": "ROUTED_TO", "dst_id": "e269111d-40ca-4a36-bf61-0e9ef66f3af8", "dst_type": "ANNOUNCEMENT" },
    { "id": "e269111d-40ca-4a36-bf61-0e9ef66f3af8", "name": "1300 Tech Support", "time": "2024-04-08 23:20:37.909496", "type": "ANNOUNCEMENT" },
    { "by": "61283791892", "time": "2024-04-08 23:20:37.909544", "type": "ANSWERED", "by_name": "" },
    { "id": "ad47052e-a88c-47e3-9cf5-f6e26fd36355", "name": "Tech Support", "time": "2024-04-08 23:21:05.556560", "type": "GROUP", "label": "TECH SUPPORT" },
    { "id": "ad47052e-a88c-47e3-9cf5-f6e26fd36355", "time": "2024-04-08 23:22:05.694916", "type": "GROUP_TIMEOUT", "alt_dest": "28cb5038-835c-4276-aee2-b80af80864c0", "alt_type": "queues" },
    { "id": "28cb5038-835c-4276-aee2-b80af80864c0", "name": "Tech Support Overflow", "time": "2024-04-08 23:22:05.708578", "type": "GROUP", "label": "Tech Support Overflow" },
    { "by": "Tech Support Overflow", "time": "2024-04-08 23:22:09.406569", "type": "HANGUP", "by_name": "61283791892" },
    { "time": "2024-04-08 23:24:18.872578", "type": "ATTENDEDTRANSFER", "transferred_to": "EXTERNAL", "transferred_from": "61290982917", "transferred_to_name": "EXTERNAL", "transferred_from_name": "Sharon Saukuru" }
]