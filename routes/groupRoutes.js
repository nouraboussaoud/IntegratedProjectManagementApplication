const express = require("express");
const mongoose = require("mongoose");
const {
    getAllGroups,
    getGroupById,
    getGroupByName,
    getGroupMembers,
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    deleteMember,
} = require("../controllers/groupController");
const router = express.Router();

router.get("/getAllGroups", getAllGroups);
router.get("/getGroupById/:id", getGroupById);
router.get("/getGroupByName/:name", getGroupByName);
router.get("/getGroupMembers/:id", getGroupMembers);
router.post("/createGroup", createGroup);
router.put("/updateGroup/:id", updateGroup);
router.delete("/deleteGroup/:id", deleteGroup);
router.put("/addMember/:email", addMember);
router.put("/deleteMember/:email", deleteMember);

module.exports = router;