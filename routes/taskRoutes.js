const express = require("express");
const router = express.Router();
const {
    getAllTasks,
    getTaskById,
    getTaskByName,
    getTaskByProject,
    getTaskByUser,
    getTaskByPriority,
    createTask,
    updateTask,
    deleteTask,
    setTaskPending,
    setTaskInProgress,
    setTaskCompleted,
    assignTask,
    sortTasksByPriority,
    updateTaskProgress,
    getTaskWithProgress,
    trackGitHubCommits,
    predictRisk,
    getMyTasks,
} = require("../controllers/taskController");
const { verifyToken } = require("../controllers/userController");

router.get("/getAllTasks",verifyToken , getAllTasks);
router.get("/getTaskById/:id",verifyToken , getTaskById);
router.get("/getTaskByName/:name",verifyToken , getTaskByName);
router.get("/getTaskByProject/:id",verifyToken , getTaskByProject);
router.get("/getTaskByUser/:id",verifyToken , getTaskByUser);
router.get("/getTaskByPriority/:priority",verifyToken , getTaskByPriority);
router.post("/createTask",verifyToken , createTask);
router.put("/updateTask/:id",verifyToken , updateTask);
router.delete("/deleteTask/:id",verifyToken , deleteTask);
router.put("/setTaskPending/:id",verifyToken , setTaskPending);
router.put("/setTaskInProgress/:id",verifyToken , setTaskInProgress);
router.put("/setTaskCompleted/:id",verifyToken , setTaskCompleted);
router.put("/assignTask/:id",verifyToken , assignTask);
router.get("/sortTasksByPriority",verifyToken , sortTasksByPriority);
router.put("/updateTaskProgress/:id",verifyToken , updateTaskProgress); // Uncomment if needed
router.get("/getTaskWithProgress",verifyToken , getTaskWithProgress); // Uncomment if needed
// ✅ Route to fetch GitHub commits and update task progress
router.get("/track-commits/:taskId", verifyToken, trackGitHubCommits);
// Route to handle task risk prediction
router.post('/predict-risk', predictRisk);
router.get('/myTasks', verifyToken, getMyTasks);module.exports = router;


