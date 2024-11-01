const { MongoClient } = require("mongodb");
//This is how I establish a connection to MongoDB but you are welcome to write your own implementation
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

async function initializeDatabase(app, dbConfig) {
  try {
    const { dbName, dbUri } = dbConfig;
    const db = await connectToDB(dbUri, dbName);
    app.locals.db = db;
    console.log("Database initialized");
  } catch (err) {
    console.error("Error initializing databases:", err);
    process.exit(1);
  }
}

module.exports = {
  initializeDatabase,
};
