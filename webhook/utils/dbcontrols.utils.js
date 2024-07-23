require("dotenv").config({
  path: "/home/vboxuser/repos/ai_signposting/webhook/.env",
});
const { MongoClient } = require("mongodb");
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

async function addLocation(client, location) {
  try {
    await client.connect();
    const db = client.db("signposting_db");
    const collection = db.collection("support_options");
    await collection.updateMany(
      { "Local / National": "Local" },
      { $set: { "location": location } }
    );

    await collection.updateMany(
      { "Local / National": { $ne: "Local" } },
      { $set: { "location": "National" } }
    );

    console.log("Fields updated successfully");
  } catch (err) {
    console.log(err);
  } finally {
    await client.close();
  }
}

addLocation(client, "Cornwall");
