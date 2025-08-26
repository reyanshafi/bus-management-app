/**
 * GPS Data Receiver API for Firebase Functions v2
 * This receives GPS data from ESP8266 and stores it in Firestore
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// API endpoint to receive GPS data from ESP8266
exports.updateBusLocation = onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const gpsData = req.body;
    
    logger.info('Received GPS data:', gpsData);
    
    // Validate required fields
    if (!gpsData.busId || gpsData.latitude === undefined || gpsData.longitude === undefined) {
      res.status(400).json({ 
        error: 'Missing required fields: busId, latitude, longitude' 
      });
      return;
    }

    // Prepare the location data
    const locationData = {
      busId: gpsData.busId,
      latitude: parseFloat(gpsData.latitude),
      longitude: parseFloat(gpsData.longitude),
      altitude: parseFloat(gpsData.altitude) || 0,
      speed: parseFloat(gpsData.speed) || 0,
      course: parseFloat(gpsData.course) || 0,
      satellites: parseInt(gpsData.satellites) || 0,
      hdop: parseFloat(gpsData.hdop) || 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdate: new Date().toISOString(),
      status: 'active'
    };

    // Add datetime if provided
    if (gpsData.datetime) {
      locationData.gpsDateTime = gpsData.datetime;
    }

    // Update or create bus location document
    await db.collection('busLocations').doc(gpsData.busId).set(locationData, { merge: true });

    // Also update the bus document with current location
    const busRef = db.collection('buses').doc(gpsData.busId);
    const busDoc = await busRef.get();
    
    if (busDoc.exists) {
      await busRef.update({
        currentLatitude: locationData.latitude,
        currentLongitude: locationData.longitude,
        lastLocationUpdate: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      });
      logger.info(`Updated bus document for ${gpsData.busId}`);
    } else {
      logger.warn(`Bus document ${gpsData.busId} does not exist - creating basic entry`);
      
      // Create a basic bus document if it doesn't exist
      await busRef.set({
        busNumber: gpsData.busId.replace('BUS_', ''),
        currentLatitude: locationData.latitude,
        currentLongitude: locationData.longitude,
        lastLocationUpdate: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        route: 'Unassigned',
        driver: 'Unassigned',
        seatsTotal: 50
      }, { merge: true });
    }

    logger.info(`Location updated for bus ${gpsData.busId}`);

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      busId: gpsData.busId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error updating bus location:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});
