const express = require("express");
const { verifyToken } = require("../controllers/userController");
const { 
  recordAttendance, 
  getAllAttendance, 
  checkAttendanceExists, 
  getAttendanceByGroupId, 
  updateAttendance ,deleteAttendance
} = require("../controllers/AttendanceController");
const router = express.Router();

// Route pour enregistrer l'attendance d'un groupe
router.post("/group/:groupId", verifyToken, recordAttendance);

// Route pour obtenir toutes les entrées d'attendance
router.get("/", verifyToken, getAllAttendance);

// Route pour vérifier si l'attendance existe déjà pour un groupe à une date donnée
router.get("/group/:groupId/date/:sessionDate", verifyToken, checkAttendanceExists);



// Modifiez vos routes comme suit :
router.get("/group/:groupId", verifyToken, getAttendanceByGroupId);
router.put("/update/:id", verifyToken, updateAttendance);
// Ajoutez cette ligne avant module.exports
router.delete("/:id", verifyToken, deleteAttendance);
module.exports = router;
