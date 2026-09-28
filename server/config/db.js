const mongoose = require('mongoose');
const dns = require('dns');

// On Windows machines and certain ISPs, Node fails to resolve SRV records without explicit public DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore
}

let isConnected = false;
let retryInterval = null;

const connectDB = async (onConnectedCallback) => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    return null;
  }

  const tryConnect = async () => {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
      if (typeof onConnectedCallback === 'function') {
        await onConnectedCallback();
      }
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
      if (error.message.includes('whitelist') || error.message.includes('Could not connect to any servers')) {
        console.warn(`
⚠️  ACTION REQUIRED IN MONGODB ATLAS:
   1. Log into MongoDB Atlas Console: https://cloud.mongodb.com
   2. Navigate to: Security -> Network Access
   3. Click "Add IP Address"
   4. Choose "Allow Access From Anywhere" (0.0.0.0/0)
      (This is required both for your current machine and for Render deployment)
   5. Wait ~1 minute for Atlas to apply the rule.
   (Server will automatically retry connecting every 15 seconds...)
        `);
      }
      if (!retryInterval) {
        retryInterval = setInterval(tryConnect, 15000);
      }
      return null;
    }
  };

  return await tryConnect();
};

module.exports = connectDB;
