require('dotenv').config();
const express=require("express");
const app=express();
const cors=require('cors');
const http=require('http')
const {Server}=require('socket.io')
const morgan=require('morgan')
const connectDB=require('./config/db');
connectDB();
const server=http.createServer(app);

const io=new Server(server,{
    cors:{
        origin:'*',
        methods:["GET","POST"]
    }
})

// Initialize Socket.IO service
const socketService = require('./services/socketService');
socketService.initialize(io);

app.set("io",io);
app.set("socketService", socketService);

const authRoutes=require('./routes/authRoutes')
const issueRoutes=require('./routes/issueRoutes')
const userRoutes=require('./routes/userRoutes')
const userManagementRoutes=require('./routes/userManagementRoutes')
const notificationRoutes=require('./routes/notificationRoutes')
const departmentRoutes=require('./routes/departmentRoutes')
const systemConfigRoutes=require('./routes/systemConfigRoutes')
const assignmentRoutes=require('./routes/assignmentRoutes')
const locationRoutes=require('./routes/locationRoutes')
const geocodingRoutes=require('./routes/geocodingRoutes')
const categoryRoutes=require('./routes/categoryRoutes')
const activityLogRoutes=require('./routes/activityLogRoutes')
const bulkOperationRoutes=require('./routes/bulkOperationRoutes')
const performanceRoutes=require('./routes/performanceRoutes')
const commentRoutes=require('./routes/commentRoutes')

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));
app.use('/api/auth',authRoutes);
app.use('/api/issues',issueRoutes);
app.use('/api/users',userRoutes);
app.use('/api/admin/users',userManagementRoutes);
app.use('/api/notifications',notificationRoutes);
app.use('/api/departments',departmentRoutes);
app.use('/api/system-config',systemConfigRoutes);
app.use('/api/assignments',assignmentRoutes);
app.use('/api/locations',locationRoutes);
app.use('/api/geocoding',geocodingRoutes);
app.use('/api/categories',categoryRoutes);
app.use('/api/activity-logs',activityLogRoutes);
app.use('/api/bulk-operations',bulkOperationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/performance',performanceRoutes);
app.use('/api/comments',commentRoutes);
app.use('/api/reports',require('./routes/reportRoutes'));
app.use('/api/dashboard',require('./routes/dashboardRoutes'));

// Error handling middleware
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

app.get('/',(req,res)=>{
    res.send('Quick care api running')
})

// Test route
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// Handle 404 errors
app.use(notFound);

// Handle all other errors
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
server.listen(PORT,()=>{
    console.log(`Server started at ${PORT}`)
})