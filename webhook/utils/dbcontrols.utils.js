require("dotenv").config({
  path: "/home/vboxuser/repos/ai_signposting/webhook/.env",
});
const { MongoClient } = require("mongodb");
const uri = process.env.TARGET_MONGO_URI;

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

async function changeFieldToDouble(client, collectionName) {
  try {
    await client.connect();
    const db = client.db("signposting_db");
    const collection = db.collection(collectionName);
    await collection
      .aggregate([
        {
          $addFields: {
            convertedFields: {
              $map: {
                input: { $objectToArray: "$$ROOT" },
                as: "field",
                in: {
                  k: "$$field.k",
                  v: {
                    $cond: {
                      if: { $eq: [{ $type: "$$field.v" }, "decimal"] },
                      then: { $toDouble: "$$field.v" },
                      else: "$$field.v",
                    },
                  },
                },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: { $arrayToObject: "$convertedFields" },
          },
        },
        {
          $merge: {
            into: collectionName, // replace with your collection name
            whenMatched: "replace",
          },
        },
      ])
      .toArray();
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

async function changeFieldToStr(client, collectionName) {
  try {
    await client.connect();
    const db = client.db("signposting_db");
    const collection = db.collection(collectionName);
    await collection
      .aggregate([
        {
          $addFields: {
            convertedFields: {
              $map: {
                input: { $objectToArray: "$$ROOT" },
                as: "field",
                in: {
                  k: "$$field.k",
                  v: {
                    $cond: {
                      if: { $eq: [{ $type: "$$field.v" }, "int64"] },
                      then: { $toString: "$$field.v" },
                      else: "$$field.v",
                    },
                  },
                },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: { $arrayToObject: "$convertedFields" },
          },
        },
        {
          $merge: {
            into: collectionName, // replace with your collection name
            whenMatched: "replace",
          },
        },
      ])
      .toArray();
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
