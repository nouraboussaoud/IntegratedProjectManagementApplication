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
    getMyGroups,
    getMyGroupss,
    rejectInvitation,getAttendanceByGroupId,
    checkGroupName,getAllGroupsForDropdown,acceptInvitation
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
router.put('/:groupId/reject-invitation',verifyToken , rejectInvitation);
router.get("/my-groups", verifyToken, getMyGroups);
router.get("/my-group", verifyToken, getMyGroupss);
router.get("/check-name", verifyToken,  checkGroupName);
router.put("/:groupId/accept-invitation", verifyToken,  acceptInvitation);

router.get("/dropdown", verifyToken,  getAllGroupsForDropdown);
// Group attendance
router.get("/:id/attendance", verifyToken, getAttendanceByGroupId);

module.exports = router;