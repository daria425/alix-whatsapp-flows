async function saveUser(db, userData) {
  try {
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

async function getUser(db, recipient) {
  try {
    // if (process.env.NODE_ENV == "development") {
    //   return testUser;
    // }
    const collection = db.collection("users");
    const user = await collection.findOne({ "WaId": recipient });
    return user;
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  getUser,
  saveUser,
};
