async function saveUser(mongoClient, userData) {
  try {
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
  }
}

async function getUser(mongoClient, recipient) {
  try {
    const db = mongoClient.db("signposting_db");
    const collection = db.collection("users");
    const user = await collection.findOne({ "WaId": recipient });
    return user;
  } catch (err) {
    console.log(err);
  }
}

async function updateUser(mongoClient, recipient, update) {
  try {
    const db = mongoClient.db("signposting_db");
    const collection = db.collection("users");
    await collection.findOneAndUpdate(
      { "WaId": recipient },
      { "$set": update }
    );
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  getUser,
  saveUser,
  updateUser,
};
