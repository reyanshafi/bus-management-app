# ESP8266 GPS Bus Tracker

This folder contains improved Arduino code for ESP8266-based GPS tracking system for buses.

## 📁 Files

- **`gps_tracker_improved.ino`** - Full-featured version with WiFi connectivity and server communication
- **`gps_tracker_basic.ino`** - Simple version for GPS tracking only (no WiFi required)

## 🔧 Hardware Requirements

- **ESP8266 Development Board** (NodeMCU, Wemos D1 Mini, etc.)
- **NEO-6M GPS Module**
- **Jumper wires**
- **Power supply** (5V or 3.3V depending on your setup)

## 📋 Wiring Diagram

### ESP8266 to NEO-6M GPS Module

| ESP8266 Pin | GPS Module Pin | Description |
|-------------|----------------|-------------|
| D1 (GPIO5)  | TX             | GPS transmit to ESP receive |
| D2 (GPIO4)  | RX             | ESP transmit to GPS receive |
| 3V3         | VCC            | Power (3.3V) |
| GND         | GND            | Ground |

### LED Status Indicator

| ESP8266 Pin | Component | Description |
|-------------|-----------|-------------|
| D4 (GPIO2)  | Built-in LED | Status indication |

## 🚀 Setup Instructions

### 1. Install Required Libraries

In Arduino IDE, go to **Sketch → Include Library → Manage Libraries** and install:

- **TinyGPS++** by Mikal Hart
- **ESP8266WiFi** (usually pre-installed)
- **ESP8266HTTPClient** (usually pre-installed) 
- **ArduinoJson** by Benoit Blanchon

### 2. Hardware Assembly

1. Connect the GPS module to ESP8266 as per wiring diagram above
2. Ensure proper power connections (3.3V to GPS VCC, GND to GND)
3. Double-check TX/RX connections (GPS TX → ESP D1, GPS RX → ESP D2)

### 3. Code Configuration

#### For Basic Version (`gps_tracker_basic.ino`):
```cpp
const String busId = "BUS_001"; // Change this for each bus
```

#### For Advanced Version (`gps_tracker_improved.ino`):
```cpp
const char* ssid = "YOUR_WIFI_SSID";           // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";    // Your WiFi password
const char* serverURL = "https://your-server.com/api/gps-update"; // Your server endpoint
const String busId = "BUS_001";                 // Change this for each bus
```

### 4. Upload and Test

1. Select your ESP8266 board in Arduino IDE
2. Choose the correct COM port
3. Upload the code
4. Open Serial Monitor (115200 baud rate)
5. Wait for GPS signal acquisition (may take 2-5 minutes outdoors)

## 📊 Features

### Basic Version
- ✅ **GPS Data Reading**: Latitude, longitude, altitude, speed, course
- ✅ **Satellite Information**: Number of satellites and HDOP
- ✅ **Visual Status**: LED blinking (fast = GPS valid, slow = no GPS)
- ✅ **Serial Output**: Detailed GPS information with Google Maps links
- ✅ **Error Handling**: Non-blocking timeout detection
- ✅ **Cardinal Directions**: Shows direction as N, NE, E, etc.
- ✅ **HDOP Quality**: Describes GPS accuracy (Excellent, Good, etc.)

### Advanced Version (Additional Features)
- ✅ **WiFi Connectivity**: Automatic connection and reconnection
- ✅ **Server Communication**: Sends GPS data to remote server
- ✅ **JSON Format**: Structured data transmission
- ✅ **Periodic Updates**: Configurable update intervals
- ✅ **System Monitoring**: Heap memory and uptime tracking
- ✅ **Robust Error Handling**: WiFi and GPS error recovery

## 🔍 LED Status Indicators

| LED Pattern | Status |
|-------------|--------|
| Fast Blink (200ms) | GPS signal valid ✅ |
| Slow Blink (1000ms) | No GPS signal ⚠️ |
| Solid ON | System starting up |
| OFF | System error |

## 🛠️ Troubleshooting

### No GPS Signal
- **Move to open area**: GPS needs clear sky view
- **Check wiring**: Verify TX/RX connections are correct
- **Wait longer**: GPS can take 2-5 minutes for first fix
- **Check power**: Ensure GPS module gets stable 3.3V

### WiFi Issues (Advanced Version)
- **Check credentials**: Verify SSID and password are correct
- **Signal strength**: Ensure strong WiFi signal
- **Network compatibility**: Some networks block device connections

### Serial Monitor Issues
- **Baud rate**: Ensure Serial Monitor is set to 115200
- **Cable**: Try different USB cable
- **Driver**: Install ESP8266 USB driver if needed

## 📈 Serial Output Example

```
📍 GPS DATA RECEIVED
🚌 Bus ID: BUS_001
📍 Coordinates:
   Latitude:  34.05223500
   Longitude: -118.24368300
   Altitude:  71.20 meters

🗺️  Location Links:
   Google Maps: https://maps.google.com/?q=34.052235,-118.243683

🚌 Movement Data:
   Speed:     25.30 km/h (15.72 mph)
   Course:    87.50° (E)

🛰️  GPS Quality:
   Satellites: 8
   HDOP:       1.20 (Excellent)

🕐 Date & Time (UTC):
   Date: 25/08/2025
   Time: 14:30:25
```

## 🔧 Pin Changes from Original

### ⚠️ Important Pin Updates
- **RXPin**: Changed from D2 to D1 (GPIO5)
- **TXPin**: Changed from D3 to D2 (GPIO4)

**Reason**: D3 (GPIO0) is used for boot mode selection and can cause boot issues.

## 📡 Server Integration

For the advanced version, your server should accept POST requests with this JSON format:

```json
{
  "busId": "BUS_001",
  "latitude": 34.052235,
  "longitude": -118.243683,
  "altitude": 71.2,
  "speed": 25.3,
  "course": 87.5,
  "satellites": 8,
  "hdop": 1.2,
  "timestamp": 12345678,
  "datetime": "2025-08-25 14:30:25"
}
```

## 🔄 Integration with Bus Management System

This GPS tracker can be integrated with the main bus management system by:

1. Setting up a server endpoint to receive GPS data
2. Storing location data in Firebase Firestore
3. Displaying real-time bus locations on admin dashboard
4. Providing live tracking for students

## 📞 Support

For issues or questions:
- 📞 Call: +91 600 507 4940
- 📧 Email: bhatmehran062@gmail.com

---

**Last Updated**: August 25, 2025
