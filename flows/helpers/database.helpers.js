const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const mongoClient = new MongoClient(uri);
async function saveUser(userData) {
  try {
    await mongoClient.connect();
    const db = mongoClient.db("signposting_db");
    const collection = db.collection("users");
    const user = await collection.findOne({ "WaId": userData.WaId });
    if (user) {
      return;
    } else
      await collection.insertOne({
        "WaId": userData.WaId,
        "ProfileName": userData.ProfileName,
      });
  } catch (err) {
    console.log(err);
  } finally {
    await mongoClient.close();
  }
}

async function getUser(recipient) {
  try {
    await mongoClient.connect();
    const db = mongoClient.db("signposting_db");
    const collection = db.collection("users");
    const user = await collection.findOne({ "WaId": recipient });
    return user;
  } catch (err) {
    console.log(err);
  } finally {
    await mongoClient.close();
  }
}

async function updateUser(recipient, update) {
  try {
    await mongoClient.connect();
    const db = mongoClient.db("signposting_db");
    const collection = db.collection("users");
    await collection.findOneAndUpdate(
      { "WaId": recipient },
      { "$set": update }
    );
  } catch (err) {
    console.log(err);
  } finally {
    await mongoClient.close();
  }
}

module.exports = {
  getUser,
  saveUser,
  updateUser,
};
