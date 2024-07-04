const express = require("express");
const { getUser } = require("../helpers/database.helpers");
const router = express.Router();
const FlowRouterService = require("../services/flowRouter.service");
const apiBase = process.env.API_BASE;
const messageTriggers = ["hi", "start"];
router.post("/", async (req, res, next) => {});
