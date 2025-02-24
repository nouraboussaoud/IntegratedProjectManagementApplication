const express = require("express");
const mongoose = require("mongoose");
const {
    getAllProjects,
    getProjectById,
    getProjectByName,
    getProjectByGroup,
    getProjectTasks,
    getProjectFinishedTasks,
    getProjectPendingTasks,
    getProjectInProgressTasks,
    createProject,
    updateProject,
    deleteProject,
    addTask,
    assignProjectToGroup,
} = require("../controllers/projectController");
const router = express.Router();

router.get("/getAllProjects", getAllProjects);
router.get("/getProjectById/:id", getProjectById);
router.get("/getProjectByName/:name", getProjectByName);
router.get("/getProjectByGroup/:id", getProjectByGroup);
router.get("/getProjectTasks/:id", getProjectTasks);
router.get("/getProjectFinishedTasks/:id", getProjectFinishedTasks);
router.get("/getProjectPendingTasks/:id", getProjectPendingTasks);
router.get("/getProjectInProgressTasks/:id", getProjectInProgressTasks);
router.post("/createProject", createProject);
router.put("/updateProject/:id", updateProject);
router.delete("/deleteProject/:id", deleteProject);
router.put("/addTask/:id", addTask);
router.put("/assignProjectToGroup/:id", assignProjectToGroup);

module.exports = router;