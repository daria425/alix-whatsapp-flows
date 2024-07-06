require("dotenv").config();
const { MongoClient } = require("mongodb");
const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongoClient = new MongoClient(uri);

module.exports = {
  mongoClient,
};
