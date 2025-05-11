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
    generateQuiz,
    submitQuiz,
    getQuizAnalytics,
} = require("../controllers/taskController");
const { verifyToken } = require("../controllers/userController");

router.get("/getAllTasks", verifyToken, getAllTasks);
router.get("/getTaskById/:id", verifyToken, getTaskById);
router.get("/getTaskByName/:name", verifyToken, getTaskByName);
router.get("/getTaskByProject/:id", verifyToken, getTaskByProject);
router.get("/getTaskByUser/:id", verifyToken, getTaskByUser);
router.get("/getTaskByPriority/:priority", verifyToken, getTaskByPriority);
router.post("/createTask", verifyToken, createTask);
router.put("/updateTask/:id", verifyToken, updateTask);
router.delete("/deleteTask/:id", verifyToken, deleteTask);
router.put("/setTaskPending/:id", verifyToken, setTaskPending);
router.put("/setTaskInProgress/:id", verifyToken, setTaskInProgress);
router.put("/setTaskCompleted/:id", verifyToken, setTaskCompleted);
router.put("/assignTask/:id", verifyToken, assignTask);
router.get("/sortTasksByPriority", verifyToken, sortTasksByPriority);
router.put("/updateTaskProgress/:id", verifyToken, updateTaskProgress);
router.get("/getTaskWithProgress", verifyToken, getTaskWithProgress);
router.get("/track-commits/:taskId", verifyToken, trackGitHubCommits);
router.post('/predict-risk', verifyToken, predictRisk);
router.get('/myTasks', verifyToken, getMyTasks);
router.post("/generateQuiz/:taskId", verifyToken, generateQuiz);
router.post("/submitQuiz/:taskId", verifyToken, submitQuiz);
router.get("/quizAnalytics/:taskId", verifyToken, getQuizAnalytics);

module.exports = router;