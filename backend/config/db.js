const mongoose = require('mongoose');

let mongoMemoryServer = null;

// Allow sufficient time for initial database handshake
mongoose.set('bufferTimeoutMS', 30000);

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bloodbridge';

  try {
    // Attempt standard connection with 2.5s server selection timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[MongoDB] Connected to database: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (primaryErr) {
    console.warn(`[MongoDB] Primary connection (${uri}) unavailable: ${primaryErr.message}`);

    // Clean any partial connection state before fallback
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch {
        /* ignore */
      }
    }

    // In dev or test environments, start embedded memory MongoDB for zero-configuration testing
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[MongoDB] Starting embedded MongoDB instance for seamless demo fallback...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        if (!mongoMemoryServer) {
          mongoMemoryServer = await MongoMemoryServer.create({
            instance: {
              dbName: 'bloodbridge',
              port: Number(process.env.MEMORY_DB_PORT) || 27019,
              ip: '127.0.0.1',
            },
          });
        }
        const memoryUri = mongoMemoryServer.getUri();
        await mongoose.connect(memoryUri, {
          serverSelectionTimeoutMS: 15000,
        });
        console.log(`[MongoDB] Connected to embedded in-memory MongoDB: ${memoryUri}`);
        return mongoose.connection;
      } catch (memErr) {
        console.error(`[MongoDB] Failed to start embedded instance: ${memErr.message}`);
        throw memErr;
      }
    } else {
      throw primaryErr;
    }
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
};

module.exports = { connectDB, disconnectDB };
