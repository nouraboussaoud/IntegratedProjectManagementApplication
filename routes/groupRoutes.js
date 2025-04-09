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
const { verifyToken } = require("../controllers/userController");
const router = express.Router();

router.get("/getAllGroups", verifyToken,getAllGroups);
router.get("/getGroupById/:id", verifyToken, getGroupById);
router.get("/getGroupByName/:name",verifyToken, getGroupByName);
router.get("/getGroupMembers/:id", verifyToken , getGroupMembers);
router.post("/createGroup", verifyToken,  createGroup);
router.put("/updateGroup/:id", verifyToken,updateGroup);
router.delete("/deleteGroup/:id", verifyToken ,  deleteGroup);
router.put("/addMember/:email", verifyToken , addMember);
router.put("/deleteMember/:email",verifyToken , deleteMember);


module.exports = router;