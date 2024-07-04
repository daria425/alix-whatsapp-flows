async function saveUser(mongoClient, userData) {
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

async function getUser(mongoClient, recipient) {
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

module.exports = {
  getUser,
  saveUser,
};
