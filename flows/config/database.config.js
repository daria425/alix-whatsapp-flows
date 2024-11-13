const { MongoClient } = require("mongodb");
async function connectToDB(uri, dbName) {
  try {
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    console.log(`Connected to ${dbName}`);
    return db;
  } catch (err) {
    console.error(`Failed to connect to ${dbName}:`, err);
    throw err;
  }
}

async function initializeDatabases(app, primaryDbConfig, secondaryDbConfig) {
  try {
    const { primaryDbName, primaryDbUri } = primaryDbConfig;
    const { secondaryDbName, secondaryDbUri } = secondaryDbConfig;
    const primaryDb = await connectToDB(primaryDbUri, primaryDbName);
    const secondaryDb = await connectToDB(secondaryDbUri, secondaryDbName);
    app.locals.signpostingOptionsDb = primaryDb;
    app.locals.controlRoomDb = secondaryDb;
    console.log("Databases initialized");
  } catch (err) {
    console.error("Error initializing databases:", err);
    process.exit(1);
  }
}

module.exports = {
  initializeDatabases,
};
