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
} = require("../controllers/taskController");
const { verifyToken } = require("../controllers/userController");

router.get("/getAllTasks",verifyToken , getAllTasks);
router.get("/getTaskById/:id",verifyToken , getTaskById);
router.get("/getTaskByName/:name",verifyToken , getTaskByName);
router.get("/getTaskByProject/:id",verifyToken , getTaskByProject);
router.get("/getTaskByUser/:id",verifyToken , getTaskByUser);
router.get("/getTaskByPriority/:priority",verifyToken , getTaskByPriority);
router.post("/createTask/:id",verifyToken , createTask);
router.put("/updateTask/:id",verifyToken , updateTask);
router.delete("/deleteTask/:id",verifyToken , deleteTask);
router.put("/setTaskPending/:id",verifyToken , setTaskPending);
router.put("/setTaskInProgress/:id",verifyToken , setTaskInProgress);
router.put("/setTaskCompleted/:id",verifyToken , setTaskCompleted);
router.put("/assignTask/:id",verifyToken , assignTask);
router.get("/sortTasksByPriority",verifyToken , sortTasksByPriority);

module.exports = router;