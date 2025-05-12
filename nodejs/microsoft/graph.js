import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// 1. Define IDENTITY constant based on provided JSON
const IDENTITY = process.env.MS_GRAPH_IDENTITY
// Helper function to get the first key of an object
const getFirstKey = (obj) => Object.keys(obj)[0];

// 2. Refresh Token Mechanism
async function refreshAccessToken(identity) {
    console.log('Attempting to refresh access token...');
    const accountKey = getFirstKey(identity.Account);
    const refreshTokenKey = getFirstKey(identity.RefreshToken);
    const refreshTokenInfo = identity.RefreshToken[refreshTokenKey];
    const refreshTokenSecret = refreshTokenInfo.secret;

    if (!clientSecret || clientSecret === 'YOUR_CLIENT_SECRET') {
        console.error('Error: Client secret is not configured. Set MS_CLIENT_SECRET environment variable.');
        throw new Error('Client secret not configured.');
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${identity.Account[accountKey].realm}/oauth2/v2.0/token`;

    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'grant_type': 'refresh_token',
                'refresh_token': refreshTokenSecret,
                'client_id': identity.AccessToken[getFirstKey(identity.AccessToken)].client_id,
                'client_secret': clientSecret,
                'scope': 'https://graph.microsoft.com/.default' // Request necessary scopes
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Failed to refresh token:', data);
            throw new Error(`Failed to refresh access token: ${data.error_description || response.statusText}`);
        }

        console.log('Access token refreshed successfully.');
        // Ideally, you should update the expires_on timestamp as well if the response provides it
        // For simplicity, we are just returning the new token here.
        // data.expires_in gives the lifetime in seconds. You'd add this to Date.now() / 1000.
        return data.access_token;

    } catch (error) {
        console.error('Error during token refresh:', error);
        throw error; // Re-throw the error to be caught by the main logic
    }
}

// 3. Call Graph API /me
async function getUserProfile(accessToken) {
    console.log('Calling Graph API /me...');
    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // If unauthorized, maybe the refresh token is also invalid
            if (response.status === 401) {
                 console.error('Graph API call Unauthorized (401). Token might be invalid or expired even after refresh.');
            } else {
                 console.error(`Graph API call failed with status: ${response.status}`);
            }
            const errorData = await response.text(); // Try to get more error details
            console.error('Error details:', errorData);
            throw new Error(`Network response was not ok (${response.status})`);
        }

        const data = await response.json();
        console.log('Successfully retrieved user profile:');
        console.log(data);
        return data;

    } catch (error) {
        console.error('Error calling getUserProfile:', error);
        throw error; // Re-throw
    }
}

// 4. Get Calendar Events
async function getCalendarEvents(accessToken) {
    console.log('Fetching calendar events...');
    try {
        // Get events for the next 7 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$select=id,createdDateTime,lastModifiedDateTime,changeKey,categories,transactionId,originalStartTimeZone,originalEndTimeZone,iCalUId,uid,reminderMinutesBeforeStart,isReminderOn,hasAttachments,subject,bodyPreview,importance,sensitivity,isAllDay,isCancelled,isOrganizer,responseRequested,seriesMasterId,showAs,type,webLink,onlineMeetingUrl,isOnlineMeeting,onlineMeetingProvider,allowNewTimeProposals,occurrenceId,isDraft,hideAttendees,responseStatus,start,end,location,locations,recurrence,attendees,organizer,onlineMeeting`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'outlook.timezone="UTC"'
                }
            }
        );

        if (!response.ok) {
            console.error(`Calendar API call failed with status: ${response.status}`);
            const errorData = await response.text();
            console.error('Error details:', errorData);
            throw new Error(`Network response was not ok (${response.status})`);
        }

        const data = await response.json();
        console.log('Successfully retrieved calendar events:');
        // console.log(JSON.stringify(data, null, 2));
        // Count the number of appointments
        console.log(`Total entries = ${data.value.length}`)
        data.value.forEach(entry => {
            console.log(`Subject = ${entry.subject}`)
            // trim the bodyPreview to 128 characters
            const trimmedPreview = entry.bodyPreview ? 
                (entry.bodyPreview.includes('\n') ? '' : 
                (entry.bodyPreview.length > 128 ? entry.bodyPreview.substring(0, 128) + '...' : entry.bodyPreview)) 
                : '';
            console.log(`Preview = ${trimmedPreview}`)
        });
        return data;

    } catch (error) {
        console.error('Error calling getCalendarEvents:', error);
        throw error;
    }
}

// Get Microsoft Bookings Availability
async function getBookingsAvailability(accessToken) {
    console.log('Fetching Microsoft Bookings availability...');
    try {
        // First, get the list of booking businesses
        const businessesResponse = await fetch(
            'https://graph.microsoft.com/v1.0/solutions/bookingBusinesses',
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!businessesResponse.ok) {
            console.error(`Bookings API call failed with status: ${businessesResponse.status}`);
            const errorData = await businessesResponse.text();
            console.error('Error details:', errorData);
            throw new Error(`Network response was not ok (${businessesResponse.status})`);
        }

        const businessesData = await businessesResponse.json();
        console.log('Successfully retrieved booking businesses:');
        
        // For each business, get its availability
        for (const business of businessesData.value) {
            console.log(`\nChecking availability for: ${business.displayName}`);
            
            // Get the staff members
            const staffResponse = await fetch(
                `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${business.id}/staffMembers`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!staffResponse.ok) {
                console.error(`Failed to get staff members for ${business.displayName}`);
                continue;
            }

            const staffData = await staffResponse.json();
            
            // Get the services
            const servicesResponse = await fetch(
                `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${business.id}/services`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!servicesResponse.ok) {
                console.error(`Failed to get services for ${business.displayName}`);
                continue;
            }

            const servicesData = await servicesResponse.json();

            // Get availability for the next 7 days
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 7);

            const availabilityResponse = await fetch(
                `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${business.id}/getStaffAvailability`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        staffIds: staffData.value.map(staff => staff.id),
                        startDateTime: {
                            dateTime: startDate.toISOString(),
                            timeZone: "UTC"
                        },
                        endDateTime: {
                            dateTime: endDate.toISOString(),
                            timeZone: "UTC"
                        }
                    })
                }
            );

            if (!availabilityResponse.ok) {
                console.error(`Failed to get availability for ${business.displayName}`);
                continue;
            }

            const availabilityData = await availabilityResponse.json();
            console.log('Available time slots:');
            console.log(JSON.stringify(availabilityData, null, 2));
        }

    } catch (error) {
        console.error('Error checking Bookings availability:', error);
        throw error;
    }
}

// Get Microsoft Bookings Availability for Specific User
async function getUserBookingsAvailability(accessToken, userId) {
    console.log(`Fetching Microsoft Bookings availability for user ${userId}...`);
    try {
        // Get all booking businesses
        const businessesResponse = await fetch(
            'https://graph.microsoft.com/v1.0/solutions/bookingBusinesses',
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!businessesResponse.ok) {
            console.error(`Bookings API call failed with status: ${businessesResponse.status}`);
            const errorData = await businessesResponse.text();
            console.error('Error details:', errorData);
            throw new Error(`Network response was not ok (${businessesResponse.status})`);
        }

        const businessesData = await businessesResponse.json();
        
        // Find the main business (Boab IT Pty Ltd)
        const mainBusiness = businessesData.value.find(business => business.displayName === "Boab IT Pty Ltd");
        
        if (!mainBusiness) {
            console.error('Main business not found');
            return;
        }

        console.log(`\nChecking business: ${mainBusiness.displayName}`);
        
        // Get staff members for this business
        const staffResponse = await fetch(
            `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${mainBusiness.id}/staffMembers`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!staffResponse.ok) {
            console.error(`Failed to get staff members for ${mainBusiness.displayName}`);
            return;
        }

        const staffData = await staffResponse.json();
        const staffMember = staffData.value.find(staff => staff.emailAddress === userId);
        
        if (!staffMember) {
            console.log(`User is not a staff member in ${mainBusiness.displayName}`);
            return;
        }

        console.log(`Found user as staff member: ${staffMember.displayName}`);

        // Get services for this staff member
        const servicesResponse = await fetch(
            `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${mainBusiness.id}/services?$filter=staffMemberIds/any(id:id eq '${staffMember.id}')`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            console.log('\nServices offered:');
            servicesData.value.forEach(service => {
                console.log(`- ${service.displayName} (${service.duration} minutes)`);
            });
        }

        // Get staff availability
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        console.log('\nFetching availability...');
        const availabilityResponse = await fetch(
            `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${mainBusiness.id}/getStaffAvailability`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    staffIds: [staffMember.id],
                    startDateTime: {
                        dateTime: now.toISOString(),
                        timeZone: "UTC"
                    },
                    endDateTime: {
                        dateTime: nextWeek.toISOString(),
                        timeZone: "UTC"
                    }
                })
            }
        );

        if (!availabilityResponse.ok) {
            const errorData = await availabilityResponse.text();
            console.error('Error getting availability:', errorData);
            return;
        }

        const availabilityData = await availabilityResponse.json();
        console.log('\nAvailability for next 7 days:');
        if (availabilityData.value && availabilityData.value.length > 0) {
            availabilityData.value.forEach(slot => {
                const start = new Date(slot.startDateTime);
                const end = new Date(slot.endDateTime);
                console.log(`- ${start.toLocaleString()} to ${end.toLocaleString()}`);
            });
        } else {
            console.log('No availability data found');
        }

        // Get booking page URL
        console.log(`\nBooking Page URL: https://outlook.office.com/bookwithme/${mainBusiness.businessUrl}`);

    } catch (error) {
        console.error('Error checking user Bookings availability:', error);
        throw error;
    }
}

// Get User Calendar Working Hours and Busy Times
async function getUserCalendarAvailability(accessToken, userId) {
    console.log(`Fetching calendar availability for user ${userId}...`);
    try {
        // Get working hours
        const workingHoursResponse = await fetch(
            `https://graph.microsoft.com/v1.0/users/${userId}/calendar/getSchedule`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    schedules: [userId],
                    startTime: {
                        dateTime: new Date().toISOString(),
                        timeZone: "UTC"
                    },
                    endTime: {
                        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        timeZone: "UTC"
                    },
                    availabilityViewInterval: 60 // 60-minute intervals
                })
            }
        );

        if (!workingHoursResponse.ok) {
            console.error(`Calendar API call failed with status: ${workingHoursResponse.status}`);
            const errorData = await workingHoursResponse.text();
            console.error('Error details:', errorData);
            throw new Error(`Network response was not ok (${workingHoursResponse.status})`);
        }

        const workingHoursData = await workingHoursResponse.json();
        console.log('Availability schedule data:', JSON.stringify(workingHoursData, null, 2));

    } catch (error) {
        console.error('Error checking calendar availability:', error);
        throw error;
    }
}

// Create a new calendar appointment
async function createCalendarAppointment(accessToken, appointmentDetails) {
    console.log('Creating new calendar appointment...');
    try {
        const response = await fetch(
            'https://graph.microsoft.com/v1.0/me/calendar/events',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject: appointmentDetails.subject,
                    body: {
                        contentType: "HTML",
                        content: appointmentDetails.body || ""
                    },
                    start: {
                        dateTime: appointmentDetails.startTime,
                        timeZone: appointmentDetails.timeZone || "UTC"
                    },
                    end: {
                        dateTime: appointmentDetails.endTime,
                        timeZone: appointmentDetails.timeZone || "UTC"
                    },
                    location: appointmentDetails.location ? {
                        displayName: appointmentDetails.location
                    } : undefined,
                    attendees: appointmentDetails.attendees ? appointmentDetails.attendees.map(email => ({
                        emailAddress: {
                            address: email,
                            name: email.split('@')[0]
                        },
                        type: "required"
                    })) : [],
                    isOnlineMeeting: appointmentDetails.isOnlineMeeting || false,
                    // onlineMeetingProvider: appointmentDetails.isOnlineMeeting ? "teamsForBusiness" : undefined,
                    allowNewTimeProposals: appointmentDetails.allowNewTimeProposals || false,
                    reminderMinutesBeforeStart: appointmentDetails.reminderMinutes || 15,
                    importance: appointmentDetails.importance || "normal",
                    sensitivity: appointmentDetails.sensitivity || "normal",
                    showAs: appointmentDetails.showAs || "busy"
                })
            }
        );

        if (!response.ok) {
            console.error(`Calendar API call failed with status: ${response.status}`);
            const errorData = await response.text();
            console.error('Error details:', errorData);
            throw new Error(`Network response was not ok (${response.status})`);
        }

        const data = await response.json();
        console.log('Successfully created appointment:');
        console.log(`Subject: ${data.subject}`);
        console.log(`Start: ${new Date(data.start.dateTime).toLocaleString()}`);
        console.log(`End: ${new Date(data.end.dateTime).toLocaleString()}`);
        if (data.onlineMeeting) {
            console.log(`Online Meeting URL: ${data.onlineMeeting.joinUrl}`);
        }
        return data;

    } catch (error) {
        console.error('Error creating calendar appointment:', error);
        throw error;
    }
}

// --- IMPORTANT: Replace with your actual client secret (use environment variables!) ---
const clientSecret = process.env.MS_CLIENT_SECRET;
// -------------------------------------------------------------------------------------

// Main execution logic
(async (identity) => {
    try {
        const accessTokenKey = getFirstKey(identity.AccessToken);
        const accessTokenInfo = identity.AccessToken[accessTokenKey];
        let currentAccessToken = accessTokenInfo.secret;
        const expiresOn = parseInt(accessTokenInfo.expires_on, 10);

        // Check if the current access token is expired (add a buffer of 60 seconds)
        const nowInSeconds = Date.now() / 1000;
        const bufferSeconds = 60;
        if (nowInSeconds >= (expiresOn - bufferSeconds)) {
            console.log(`Access token expired or nearing expiration (Expires: ${new Date(expiresOn * 1000).toISOString()}, Now: ${new Date(nowInSeconds * 1000).toISOString()}).`);
            currentAccessToken = await refreshAccessToken(identity);
        } else {
            console.log('Access token is still valid.');
        }

        // Call the Graph API with the valid token
        const userProfile = await getUserProfile(currentAccessToken);
        
        // Get calendar events
        await getCalendarEvents(currentAccessToken);

        // Get calendar working hours and busy times
        await getUserCalendarAvailability(currentAccessToken, userProfile.userPrincipalName);

        // Example: Create a new appointment
        const newAppointment = {
            subject: "Team Meeting",
            body: "Discuss project progress and next steps",
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
            timeZone: "UTC",
            location: "Conference Room A",
            attendees: ["colleague@example.com"],
            isOnlineMeeting: true,
            allowNewTimeProposals: true,
            reminderMinutes: 30,
            importance: "high",
            sensitivity: "private",
            showAs: "busy"
        };

        // Uncomment to create the appointment
        // await createCalendarAppointment(currentAccessToken, newAppointment);

    } catch (error) {
        console.error('An error occurred in the main execution:', error.message);
    }
})(IDENTITY);

// EXPECTED OUTPUT
// Access token expired or nearing expiration (Expires: 2025-04-13T08:25:17.000Z, Now: 2025-05-11T06:08:40.759Z).
// Attempting to refresh access token...
// Access token refreshed successfully.
// Calling Graph API /me...
// Successfully retrieved user profile:
// {
//   '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/$entity',
//   businessPhones: [],
//   displayName: 'Aang Kunaefi',
//   givenName: 'Aang',
//   jobTitle: null,
//   mail: 'aang.kunaefi@connectsmart.cloud',
//   mobilePhone: null,
//   officeLocation: null,
//   preferredLanguage: null,
//   surname: 'Kunaefi',
//   userPrincipalName: 'aang.kunaefi@connectsmart.cloud',
//   id: 'e9869783-f4f2-4d69-b327-f03cbc00c746'
// }