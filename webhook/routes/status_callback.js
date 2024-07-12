const express = require("express");
const router = express.Router();
const {
  handleStatusCallback,
} = require("../controllers/statusCallbackController");

router.post("/", handleStatusCallback);
module.exports = router;
