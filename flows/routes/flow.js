const express = require("express");
const router = express.Router();

router.post("/", (req, res, next) => {
  try {
    const { message } = req.body;
    const flow = req.query;
    console.log(flow, message);
    res.status(200).send({
      message: message + "recieved!",
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;
