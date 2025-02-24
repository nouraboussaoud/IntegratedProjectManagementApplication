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

router.get("/getAllTasks", getAllTasks);
router.get("/getTaskById/:id", getTaskById);
router.get("/getTaskByName/:name", getTaskByName);
router.get("/getTaskByProject/:id", getTaskByProject);
router.get("/getTaskByUser/:id", getTaskByUser);
router.get("/getTaskByPriority/:priority", getTaskByPriority);
router.post("/createTask/:id", createTask);
router.put("/updateTask/:id", updateTask);
router.delete("/deleteTask/:id", deleteTask);
router.put("/setTaskPending/:id", setTaskPending);
router.put("/setTaskInProgress/:id", setTaskInProgress);
router.put("/setTaskCompleted/:id", setTaskCompleted);
router.put("/assignTask/:id", assignTask);
router.get("/sortTasksByPriority", sortTasksByPriority);

module.exports = router;