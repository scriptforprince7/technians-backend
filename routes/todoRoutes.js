const express = require("express");
const router = express.Router();
const { createTodoItem, getUserTodos, toggleTodoStatus, deleteTodoItem } = require("../controllers/todoController");
const { authenticate } = require("../middleware/authMiddleware");

router.post("/", authenticate, createTodoItem);
router.get("/", authenticate, getUserTodos);
router.put("/:id", authenticate, toggleTodoStatus);
router.delete("/:id", authenticate, deleteTodoItem);

module.exports = router;
