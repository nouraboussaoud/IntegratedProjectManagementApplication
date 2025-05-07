const express = require("express");
const router = express.Router();
const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectsToGroups
} = require("../controllers/subjectController");
const { verifyToken } = require("../controllers/userController");

router.get("/getAllSubjects", verifyToken, getAllSubjects);
router.get("/getSubjectById/:id", verifyToken, getSubjectById);
router.post("/createSubject", verifyToken, createSubject);
router.put("/updateSubject/:id", verifyToken, updateSubject);
router.delete("/deleteSubject/:id", verifyToken, deleteSubject);
router.get("/assign", verifyToken, assignSubjectsToGroups);
module.exports = router;

