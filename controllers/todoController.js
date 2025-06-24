const db = require("../config/db")

const createTodoItem = async (req, res) => {
    const { title, description } = req.body;
  
    try {
      const newTodo = await db.query(
        "INSERT INTO todos (user_id, title, description) VALUES ($1, $2, $3) RETURNING *",
        [req.user.id, title, description]
      );
      res.status(201).json(newTodo.rows[0]);
    } catch (err) {
      console.error("Error creating todo:", err);
      res.status(500).json({ message: "Error creating To-do" });
    }
  };
  

  const getUserTodos = async (req, res) => {
    try {
      const todos = await db.query("SELECT * FROM todos WHERE user_id = $1", [
        req.user.id,
      ]);
      res.status(200).json(todos.rows);
    } catch (err) {
      console.error("Error fetching todos", err);
      res.status(500).json({ message: "Error fetching To-Dos" });
    }
  };
  

const toggleTodoStatus = async (req,res) => {
    const {id} = req.params;
    // get status as default from the req.body
    const { status } = req.body ;
    
    try {
        const updateTodo = await db.query(
            "UPDATE todos SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        if(updateTodo.rows.length === 0) {
           return res.status(404).json({message: "Todo not found"});
        }

        return res.status(200).json(updateTodo.rows[0]);
        
    } catch (error) {
        console.log(error);
        res.status(500). json({message: "Error updating To-Do status"});
    }
};

const deleteTodoItem = async(req,res) => {
    const {id} = req.params;

    try {
        const deleteTodo = await db.query(
            "DELETE FROM todos WHERE ID = $1 RETURNING *", [id]
        );

        if(deleteTodo.rows.length===0) {
            return res.status(404).json({message: "Todo not found"});
        }
        res.status(200).json ({message: "To-Do deleted"});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Error deleting To-do"});
    }
};


module.exports = { createTodoItem, getUserTodos, toggleTodoStatus, deleteTodoItem};