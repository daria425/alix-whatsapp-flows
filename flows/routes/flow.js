const express = require("express");
const router = express.Router();
const { flowController } = require("../controllers/flowController");
router.post("/:flowName", flowController);

module.exports = router;
