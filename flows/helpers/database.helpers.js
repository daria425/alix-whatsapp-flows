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
    const collection = db.collection("users");
    const user = await collection.findOne({ "WaId": recipient });
    return user;
  } catch (err) {
    console.log(err);
  }
}

async function updateUser(db, recipient, update) {
  try {
    const collection = db.collection("users");
    await collection.findOneAndUpdate(
      { "WaId": recipient },
      { "$set": update }
    );
  } catch (err) {
    console.log(err);
  }
}

async function getNationalOptions(db, tag, page, pageSize = 5) {
  try {
    const projection = {
      "Name": 1,
      "Postcode": 1,
      "Local / National": 1,
      "Website": 1,
      "Email": 1,
      "Phone - call": 1,
      "Category tags": 1,
      "Logo-link": 1,
      "Short text description": 1,
      "longitude": 1,
      "latitude": 1,
    };
    const collection = db.collection("support_options");
    const foundOptions = await collection.aggregate([
      {
        $facet: {
          meta: [
            {
              $match: {
                $and: [
                  { "Category tags": tag },
                  { "Local / National": "National" },
                ],
              },
            },
            { $count: "totalCount" },
          ],
          results: [
            {
              $match: {
                $and: [
                  { "Category tags": tag },
                  { "Local / National": "National" },
                ],
              },
            },
            { $skip: (parseInt(page) - 1) * pageSize },
            { $limit: pageSize },
            { $project: projection },
          ],
        },
      },
    ]);
    const taggedOptions = await foundOptions.toArray();
    taggedOptions[0].page = page;
    const totalCount = taggedOptions[0].meta[0].totalCount;
    taggedOptions[0].remaining = totalCount - pageSize * page;
    return taggedOptions;
  } catch (err) {
    console.log(err);
  }
}

async function getLocalOptions(db, tag, page = 1, pageSize = 5) {
  try {
    const collection = db.collection("support_options");
    const projection = {
      "Name": 1,
      "Postcode": 1,
      "Local / National": 1,
      "Website": 1,
      "Email": 1,
      "Phone - call": 1,
      "Category tags": 1,
      "Logo-link": 1,
      "Short text description": 1,
      "longitude": 1,
      "latitude": 1,
    };
    const foundOptions = await collection.aggregate([
      {
        $facet: {
          meta: [
            {
              $match: {
                $and: [
                  { "Category tags": tag },
                  { "Local / National": "Local" },
                ],
              },
            },
            { $count: "totalCount" },
          ],
          results: [
            {
              $match: {
                $and: [
                  { "Category tags": tag },
                  { "Local / National": "Local" },
                ],
              },
            },
            { $skip: (parseInt(page) - 1) * pageSize },
            { $limit: pageSize },
            { $project: projection },
          ],
        },
      },
    ]);
    const taggedOptions = await foundOptions.toArray();
    taggedOptions[0].page = page;
    const totalCount = taggedOptions[0].meta[0].totalCount;
    taggedOptions[0].remaining = totalCount - pageSize * page;
    return taggedOptions;
  } catch (err) {
    console.log(err);
  }
}

async function getLocalAndNationalOptions(db, tag, page, pageSize = 5) {
  try {
    const collection = db.collection("support_options");
    const projection = {
      "Name": 1,
      "Postcode": 1,
      "Local / National": 1,
      "Website": 1,
      "Email": 1,
      "Phone - call": 1,
      "Category tags": 1,
      "Logo-link": 1,
      "Short text description": 1,
      "longitude": 1,
      "latitude": 1,
    };
    const foundOptions = await collection.aggregate([
      {
        $facet: {
          meta: [
            {
              $match: {
                $and: [
                  { "Category tags": tag },
                  { "Local / National": { $in: ["Local", "National"] } },
                ],
              },
            },
            { $count: "totalCount" },
          ],
          results: [
            {
              $match: {
                $and: [
                  { "Category tags": tag },
                  { "Local / National": { $in: ["Local", "National"] } },
                ],
              },
            },
            { $sort: { "Local / National": 1 } },
            { $skip: (parseInt(page) - 1) * pageSize },
            { $limit: pageSize },
            { $project: projection },
          ],
        },
      },
    ]);
    const taggedOptions = await foundOptions.toArray();
    taggedOptions[0].page = page;
    const totalCount = taggedOptions[0].meta[0].totalCount;
    taggedOptions[0].remaining = totalCount - pageSize * page;
    return taggedOptions;
  } catch (err) {
    console.log(err);
  }
}

async function selectOptions(db, tag, location, page, pageSize) {
  const locationFunctions = {
    "national only": getNationalOptions,
    "local only": getLocalOptions,
    "local and national": getLocalAndNationalOptions,
  };

  if (locationFunctions[location]) {
    const result = await locationFunctions[location](db, tag, page, pageSize);
    const remaining = result[0].remaining;
    return {
      result: result[0].results,
      remaining: remaining,
    };
  }
}

module.exports = {
  getUser,
  saveUser,
  updateUser,
  selectOptions,
};
