const express = require("express");
const mongoose = require("mongoose");
const {
  
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    calculateProjectProgress,
    getProjectByName,

    
} = require("../controllers/projectController");
const { verifyToken } = require("../controllers/userController");
const router = express.Router();

router.post("/createProject",verifyToken , createProject);
// Get all projects

router.get("/projects", getAllProjects);

// Get project by ID
router.get("/projects/:name", getProjectByName);
// Update project by ID
router.put("/projects/:id", updateProject);
router.get("/projects/:id", getProjectById);

// Delete project by ID
router.delete("/projects/:id", deleteProject);
router.get("/:id/progress", calculateProjectProgress);


module.exports = router;