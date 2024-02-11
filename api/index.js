const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectiondb = "mongodb://127.0.0.1:27017";
const database_name = "to-do-appdb";
const collection_name = "tasks";
let database;
let collection;

const initializeDatabase = async () => {
    try {
        const client = await MongoClient.connect(connectiondb, { useNewUrlParser: true, useUnifiedTopology: true });
        database = client.db(database_name);
        collection = database.collection(collection_name);
        console.log("Database is connected...");

        // Check if the collection exists, if not, create it
        const collinfo = await database.listCollections({ name: collection_name }).next();
        if (!collinfo) {
            await database.createCollection(collection_name);
            console.log('Collection created:', collection_name);
        } else {
            console.log('Collection already exists:', collection_name);
        }
    } catch (err) {
        console.error('Error connecting to the database:', err);
    }
};

const PORT = 4000;
const server = app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Server is running on port ${PORT}`);
});

app.get('/api/todoapp/gettasks', async (req, res) => {
    try {
        if (!collection) {
            return res.status(500).json({ error: 'Database connection not established' });
        }

        const tasks = await collection.find({}).toArray();
        res.json(tasks);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/todoapp/addtasks', async (req, res) => {
    try {
        if (!collection) {
            return res.status(500).json({ error: 'Database connection not established' });
        }

        const { title, description } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and Description are required.' });
        }

        const task = { title, description };
        const result = await collection.insertOne(task);

        if (!result.insertedId) {
            return res.status(500).json({ error: 'Failed to add task' });
        }

        const insertedTask = { _id: result.insertedId, ...task }; // Include the inserted _id in the response
        console.log('Inserted Task:', insertedTask);
        res.status(201).json(insertedTask); // Use 201 status code for successful creation
    } catch (err) {
        console.error('Error adding task:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.delete('/api/todoapp/deletetasks/:id', async (req, res) => {
    try {
        if (!collection) {
            return res.status(500).json({ error: 'Database connection not established' });
        }

        const taskId = req.params.id;
        const result = await collection.deleteOne({ _id: new ObjectId(taskId) });

        if (result.deletedCount === 1) {
            console.log('Task deleted successfully');
            res.json({ success: true });
        } else {
            console.error('Error deleting task: Task not found');
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

process.on('SIGINT', () => {
    console.log('Server is shutting down...');
    server.close(() => {
        console.log('Server closed');
        if (database) {
            database.client.close(); // Close the MongoDB connection
        }
        process.exit(0);
    });
});
