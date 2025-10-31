require('dotenv').config();
const express = require("express");
const app = express();
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("new client connected", socket.id);
    socket.on("disconnect", () => {
        console.log("client disconnected", socket.id);
    });
});

app.set("io", io);

// Basic middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Basic routes
app.get('/', (req, res) => {
    res.send('QuickCare API running - Test Mode');
});

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working',
        timestamp: new Date()
    });
});

// Simple auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Simple issue routes
const issueRoutes = require('./routes/issueRoutes');
app.use('/api/issues', issueRoutes);

// Error handling middleware
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server started at ${PORT}`);
});