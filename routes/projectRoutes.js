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
const { verifyToken } = require("../controllers/userController");
const router = express.Router();

router.get("/getAllProjects",verifyToken ,getAllProjects);
router.get("/getProjectById/:id" ,verifyToken , getProjectById);
router.get("/getProjectByName/:name",verifyToken , getProjectByName);
router.get("/getProjectByGroup/:id",verifyToken , getProjectByGroup);
router.get("/getProjectTasks/:id",verifyToken , getProjectTasks);
router.get("/getProjectFinishedTasks/:id",verifyToken , getProjectFinishedTasks);
router.get("/getProjectPendingTasks/:id",verifyToken , getProjectPendingTasks);
router.get("/getProjectInProgressTasks/:id",verifyToken , getProjectInProgressTasks);
router.post("/createProject",verifyToken , createProject);
router.put("/updateProject/:id",verifyToken , updateProject);
router.delete("/deleteProject/:id",verifyToken , deleteProject);
router.put("/addTask/:id",verifyToken , addTask);
router.put("/assignProjectToGroup/:id",verifyToken , assignProjectToGroup);

module.exports = router;