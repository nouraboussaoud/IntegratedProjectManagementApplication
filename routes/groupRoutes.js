const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const {
    getAllGroups,
    getGroupById,
    getGroupMembers,
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    deleteMember,
} = require("../controllers/groupController");

router.get("/getAllGroups", getAllGroups);
router.get("/getGroupById/:id", getGroupById);
router.get("/getGroupMembers/:id", getGroupMembers);
router.post("/createGroup", createGroup);
router.put("/updateGroup/:id", updateGroup);
router.delete("/deleteGroup/:id", deleteGroup);
router.put("/addMember/:id", addMember);
router.put("/deleteMember/:id", deleteMember);

module.exports = router;