# QuickCare Frontend-Backend Integration Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or connection string)
- Git

### 1. Backend Setup
```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:3001`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```
The frontend will run on `http://localhost:3000`

### 3. Test Integration
```bash
cd frontend
node test-integration.js
```

## 🔧 Configuration

### Backend Configuration
- **Port**: 3001 (configurable via `PORT` environment variable)
- **Database**: MongoDB connection via `MONGODB_URI`
- **JWT**: Secret key via `JWT_SECRET`
- **Email**: SMTP configuration for notifications

### Frontend Configuration
- **API URL**: `http://localhost:3001/api` (configurable via `REACT_APP_API_URL`)
- **Port**: 3000 (default React port)

## 🌟 Key Features Implemented

### ✅ Authentication System
- **Auto-login Registration**: Users are automatically logged in after successful registration
- **JWT Token Management**: Secure token-based authentication
- **Protected Routes**: Route protection based on authentication status
- **Role-based Access**: Different access levels for Admin, Department, and Citizen users

### ✅ Issue Management
- **Create Issues**: Full form with validation, image upload, and location tagging
- **List Issues**: Paginated list with filtering and search capabilities
- **Issue Details**: Comprehensive view with comments, timeline, and status updates
- **Status Management**: Real-time status updates for authorized users

### ✅ Real-time Features
- **Socket.IO Integration**: Real-time notifications and updates
- **Live Status Updates**: Instant status changes across all connected clients
- **Notification System**: Toast notifications for user feedback

### ✅ UI/UX Components
- **Responsive Design**: Mobile-first responsive layout
- **Loading States**: Proper loading indicators throughout the app
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Form Validation**: Real-time form validation with helpful feedback

## 📱 Frontend Components

### Core Components
- **AuthContext**: Global authentication state management
- **ProtectedRoute**: Route protection wrapper
- **Navbar**: Navigation with user menu and notifications
- **LoadingSpinner**: Reusable loading component

### Page Components
- **Register**: User registration with auto-login
- **Login**: User authentication
- **Dashboard**: User dashboard with statistics and quick actions
- **IssueList**: Paginated issue listing with filters
- **CreateIssue**: Issue creation form with image upload
- **IssueDetail**: Detailed issue view with comments and timeline

## 🔌 API Integration

### Authentication Endpoints
```javascript
POST /api/auth/register    // Register with auto-login
POST /api/auth/login       // User login
POST /api/auth/logout      // User logout
GET  /api/auth/me          // Get current user
```

### Issue Management Endpoints
```javascript
GET    /api/issues         // List issues with pagination
POST   /api/issues         // Create new issue
GET    /api/issues/:id     // Get issue details
PUT    /api/issues/:id/status // Update issue status
GET    /api/issues/:id/timeline // Get issue timeline
```

### Other Endpoints
```javascript
GET /api/categories        // Get issue categories
GET /api/assignments       // Get assignments
GET /api/locations/nearby  // Get nearby locations
```

## 🔄 Data Flow

### Registration Flow
1. User fills registration form with validation
2. Frontend sends registration data to backend
3. Backend creates user and generates JWT token
4. Backend returns user data and token
5. Frontend stores token and updates auth state
6. User is automatically redirected to dashboard

### Issue Creation Flow
1. User fills issue form with location and images
2. Frontend validates form data
3. FormData is sent to backend with multipart/form-data
4. Backend processes images and saves issue
5. User is redirected to issue list
6. Real-time notification sent to relevant users

### Status Update Flow
1. Authorized user changes issue status
2. Frontend sends status update to backend
3. Backend validates permissions and updates status
4. Real-time update sent to all connected clients
5. Timeline updated with status change

## 🛡️ Security Features

### Frontend Security
- **Token Storage**: JWT tokens stored in localStorage
- **Automatic Token Refresh**: Handles token expiration
- **Route Protection**: Prevents unauthorized access
- **Input Validation**: Client-side validation for better UX

### Backend Security
- **JWT Authentication**: Secure token-based auth
- **Role-based Authorization**: Different permission levels
- **Input Sanitization**: Prevents XSS attacks
- **Rate Limiting**: Prevents abuse
- **CORS Configuration**: Proper cross-origin setup

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration with auto-login
- [ ] User login/logout
- [ ] Protected route access
- [ ] Issue creation with images
- [ ] Issue listing and filtering
- [ ] Issue status updates
- [ ] Real-time notifications
- [ ] Mobile responsiveness

### Automated Testing
```bash
# Backend API tests
cd backend
npm run test:api

# Frontend integration tests
cd frontend
node test-integration.js
```

## 🚨 Troubleshooting

### Common Issues

#### Backend not starting
- Check MongoDB connection
- Verify environment variables
- Check port availability (3001)

#### Frontend not connecting to backend
- Verify backend is running on port 3001
- Check CORS configuration
- Verify API_URL in frontend

#### Authentication issues
- Check JWT_SECRET configuration
- Verify token storage in browser
- Check network requests in browser dev tools

#### Image upload issues
- Check multer configuration
- Verify file size limits
- Check upload directory permissions

### Debug Mode
Enable debug logging:
```bash
# Backend
DEBUG=* npm start

# Frontend
REACT_APP_DEBUG=true npm start
```

## 📈 Performance Optimization

### Backend Optimizations
- Database indexing for frequently queried fields
- Image compression and optimization
- Caching for static data
- Connection pooling for database

### Frontend Optimizations
- Code splitting for route-based chunks
- Image lazy loading
- Debounced search inputs
- Memoized components for expensive renders

## 🔮 Future Enhancements

### Planned Features
- [ ] Push notifications
- [ ] Offline support with service workers
- [ ] Advanced filtering and search
- [ ] Bulk operations for issues
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)

### Technical Improvements
- [ ] TypeScript migration
- [ ] Unit and integration tests
- [ ] CI/CD pipeline
- [ ] Docker containerization
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the console logs
3. Test with the integration script
4. Check network requests in browser dev tools

## 🎯 Success Metrics

The integration is successful when:
- ✅ Users can register and are automatically logged in
- ✅ All protected routes work correctly
- ✅ Issues can be created, viewed, and updated
- ✅ Real-time notifications work
- ✅ The app is responsive on mobile devices
- ✅ Error handling provides helpful feedback
- ✅ Performance is acceptable (< 3s load times)

---

**Happy coding! 🚀**