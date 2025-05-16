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