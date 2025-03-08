const express = require("express");
const mongoose = require("mongoose");

const {
    getLatestCommit
} = require("../controllers/DeliverableController");
const router = express.Router();

router.get("/getLatestCommit", getLatestCommit);

module.exports = router;