const express = require("express");
const router = express.Router();
const { aiDetection } = require("../controllers/aiDetection.controller");
const aiAuth = require("../middleware/aiAuthMiddleware");

router.get("/:deliverableId", aiAuth, aiDetection);


module.exports = router;
