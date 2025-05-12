const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const authProvider = require('./your-auth-provider'); // Your existing auth provider

async function getBookingsBusinesses(client) {
  try {
    // Get all booking businesses in the organization
    const businesses = await client
      .api('/solutions/bookingBusinesses')
      .get();
    
    return businesses.value;
  } catch (error) {
    console.error('Error getting bookings businesses:', error);
    throw error;
  }
}

async function getBookingService(client, businessId, serviceId) {
  try {
    const service = await client
      .api(`/solutions/bookingBusinesses/${businessId}/services/${serviceId}`)
      .get();
    
    return service;
  } catch (error) {
    console.error('Error getting booking service:', error);
    throw error;
  }
}

async function getBookingAppointments(client, businessId) {
  try {
    const appointments = await client
      .api(`/solutions/bookingBusinesses/${businessId}/appointments`)
      .get();
    
    return appointments.value;
  } catch (error) {
    console.error('Error getting booking appointments:', error);
    throw error;
  }
}

async function getStaffAvailability(client, businessId, staffIds, startDateTime, endDateTime) {
  try {
    const availability = await client
      .api(`/solutions/bookingBusinesses/${businessId}/getStaffAvailability`)
      .post({
        staffIds: staffIds,
        startDateTime: startDateTime,
        endDateTime: endDateTime
      });
    
    return availability.value;
  } catch (error) {
    console.error('Error getting staff availability:', error);
    throw error;
  }
}

// Example usage
async function main() {
  // Initialize the Graph client with your auth provider
  const client = Client.init({
    authProvider: (done) => {
      authProvider.getAccessToken()
        .then((token) => {
          done(null, token);
        })
        .catch((error) => {
          done(error, null);
        });
    }
  });
  
  try {
    // Get all booking businesses
    const businesses = await getBookingsBusinesses(client);
    console.log('Booking Businesses:', businesses);
    
    if (businesses.length > 0) {
      const businessId = businesses[0].id;
      
      // Get all services for the first business
      const services = await client
        .api(`/solutions/bookingBusinesses/${businessId}/services`)
        .get();
      console.log('Services:', services.value);
      
      // Get all appointments
      const appointments = await getBookingAppointments(client, businessId);
      console.log('Appointments:', appointments);
      
      // Get staff availability
      const staffMembers = await client
        .api(`/solutions/bookingBusinesses/${businessId}/staffMembers`)
        .get();
      
      if (staffMembers.value.length > 0) {
        const staffIds = staffMembers.value.map(staff => staff.id);
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        
        const availability = await getStaffAvailability(
          client,
          businessId,
          staffIds,
          now.toISOString(),
          nextWeek.toISOString()
        );
        
        console.log('Staff Availability:', availability);
      }
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main();