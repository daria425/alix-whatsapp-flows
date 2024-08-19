async function getOrganization(db, organizationNumber) {
  try {
    const collection = db.collection("organizations");
    const organization = await collection.findOne({
      "organizationPhoneNumber": organizationNumber,
    });
    return organization;
  } catch (err) {
    console.error(err);
  }
}

async function updateOrganizationWithContact(
  db,
  organizationNumber,
  contactId
) {
  const collection = db.collection("organizations");
  await collection.updateOne(
    { "organizationPhoneNumber": organizationNumber },
    {
      $push: {
        organizationContacts: contactId,
      },
    }
  );
}

async function saveUser(db, userData, organizationNumber) {
  try {
    const collection = db.collection("contacts");
    const user = await collection.findOne({ "WaId": userData.WaId });
    const organization = await getOrganization(db, organizationNumber);
    if (user) {
      return;
    } else {
      const result = await collection.insertOne({
        "WaId": userData.WaId,
        "ProfileName": userData.ProfileName,
        "organizationId": organization._id,
      });
      const insertedId = result.insertedId;
      await updateOrganizationWithContact(db, organizationNumber, insertedId);
    }
  } catch (err) {
    console.log(err);
  }
}

async function getUser(db, recipient) {
  try {
    const collection = db.collection("contacts");
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
