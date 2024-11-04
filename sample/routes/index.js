const express = require("express");
const router = express.Router();

/* This is just for fun */
router.get("/", function (req, res, next) {
  res.status(200).json({ message: "Hello from sample app" });
});

module.exports = router;
