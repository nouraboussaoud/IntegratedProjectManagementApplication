const express = require("express");
const { getLatestCommit, getCommits, getRepositories, getBranches, getCommitsByBranch } = require("../controllers/DeliverableController");
const { verifyToken } = require("../controllers/userController");

const router = express.Router();

router.get("/getLatestCommit", verifyToken, getLatestCommit);
router.get("/getCommits", verifyToken, getCommits);
router.get("/repositories", verifyToken, getRepositories);
router.get("/repositories/:repo/branches", verifyToken, getBranches);
router.get("/repositories/:repo/branches/:branch/commits", verifyToken, getCommitsByBranch);

module.exports = router;