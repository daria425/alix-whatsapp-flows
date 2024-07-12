const { firestore } = require("../config/firestore.config");
const { api_base } = require("../config/api_base.config");
const axios = require("axios");

async function handleStatusCallback(req, res, next) {
  try {
    const body = JSON.parse(JSON.stringify(req.body));
    if (body.MessageStatus === "delivered") {
      console.log("status cb", body);
    }
    res.status(200).send("acknowledged");
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
}

module.exports = { handleStatusCallback };
