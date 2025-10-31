const mongoose=require("mongoose");
const bcrypt=require("bcrypt");

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,'Name is required'],
        trim:true,
        minLength:2
    },
    email:{
        type:String,
        required:[true,'Email is required'],
        unique:true,
        lowercase:true,
        match:[/^\S+@\S+\.\S+$/,'Please enter a valid email address']
    },
    contact:{
        type:String,
        required:[true,'Contact number is required'],
        trim:true
    },
    password:{
        type:String,
        required:[true,'Password is required'],
        minLength:8,
        select:false 
    },
    role:{
        type:String,
        enum: ['citizen', 'admin', 'department_officer', 'moderator', 'system_admin'],
        default:'citizen',
        trim:true
    },
    department:{
        type:String,
        trim:true
    },
    employeeId:{
        type:String,
        trim:true
    },
    isActive:{
        type:Boolean,
        default:true
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    emailVerifiedAt:{
        type:Date
    },
    lastLogin:{
        type:Date
    },
    profileImage:{
        type:String // URL to profile image
    },
    pendingEmailChange:{
        type:String,
        lowercase:true
    },
    address:{
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'India' }
    },
    permissions:{
        canCreateIssues: { type: Boolean, default: true },
        canAssignIssues: { type: Boolean, default: false },
        canModerateContent: { type: Boolean, default: false },
        canManageUsers: { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: false },
        canSystemConfig: { type: Boolean, default: false }
    },
    assignedIssues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Issue'
    }],
    reportedIssues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Issue'
    }]
},{timestamps:true});

userSchema.pre('save',async function(next){
    if(!this.isModified('password'))return next();
    this.password=await bcrypt.hash(this.password,12);
    next();
});

// Set permissions based on role
userSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('role')) {
        this.setPermissionsByRole();
    }
    next();
});

userSchema.methods.comparePassword=async function(password){
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.setPermissionsByRole = function() {
    const rolePermissions = {
        citizen: {
            canCreateIssues: true,
            canAssignIssues: false,
            canModerateContent: false,
            canManageUsers: false,
            canViewAnalytics: false,
            canSystemConfig: false
        },
        department_officer: {
            canCreateIssues: true,
            canAssignIssues: false,
            canModerateContent: false,
            canManageUsers: false,
            canViewAnalytics: false,
            canSystemConfig: false
        },
        admin: {
            canCreateIssues: true,
            canAssignIssues: true,
            canModerateContent: true,
            canManageUsers: true,
            canViewAnalytics: true,
            canSystemConfig: false
        },
        moderator: {
            canCreateIssues: true,
            canAssignIssues: false,
            canModerateContent: true,
            canManageUsers: false,
            canViewAnalytics: true,
            canSystemConfig: false
        },
        system_admin: {
            canCreateIssues: true,
            canAssignIssues: true,
            canModerateContent: true,
            canManageUsers: true,
            canViewAnalytics: true,
            canSystemConfig: true
        }
    };

    this.permissions = rolePermissions[this.role] || rolePermissions.citizen;
};

userSchema.methods.hasPermission = function(permission) {
    return this.permissions && this.permissions[permission] === true;
};

// Check if user can perform action on resource
userSchema.methods.canPerformAction = function(action, resource = null) {
    const rolePermissions = {
        citizen: [
            'canCreateIssues',
            'canViewOwnIssues', 
            'canCommentOnIssues',
            'canUpdateOwnProfile'
        ],
        department_officer: [
            'canCreateIssues',
            'canViewOwnIssues',
            'canCommentOnIssues', 
            'canUpdateOwnProfile',
            'canViewDepartmentIssues',
            'canUpdateIssueStatus'
        ],
        moderator: [
            'canCreateIssues',
            'canViewOwnIssues',
            'canCommentOnIssues',
            'canUpdateOwnProfile',
            'canModerateContent',
            'canViewAnalytics',
            'canDeleteComments',
            'canSuspendUsers'
        ],
        admin: [
            'canCreateIssues',
            'canViewOwnIssues', 
            'canCommentOnIssues',
            'canUpdateOwnProfile',
            'canAssignIssues',
            'canModerateContent',
            'canManageUsers',
            'canViewAnalytics',
            'canDeleteComments',
            'canSuspendUsers',
            'canManageDepartments',
            'canViewReports'
        ],
        system_admin: [
            'canCreateIssues',
            'canViewOwnIssues',
            'canCommentOnIssues', 
            'canUpdateOwnProfile',
            'canAssignIssues',
            'canModerateContent',
            'canManageUsers',
            'canViewAnalytics',
            'canSystemConfig',
            'canDeleteComments',
            'canSuspendUsers',
            'canManageDepartments',
            'canViewReports',
            'canManageRoles',
            'canViewSecurityLogs',
            'canManageSystemSettings'
        ]
    };

    const userPermissions = rolePermissions[this.role] || [];
    return userPermissions.includes(action);
};

// Check if user can assign a specific role
userSchema.methods.canAssignRole = function(targetRole) {
    const roleHierarchy = {
        citizen: 1,
        department_officer: 2,
        moderator: 3,
        admin: 4,
        system_admin: 5
    };

    const userLevel = roleHierarchy[this.role] || 0;
    const targetLevel = roleHierarchy[targetRole] || 0;

    // System admins can assign any role
    if (this.role === 'system_admin') return true;
    
    // Admins can assign roles below their level
    if (this.role === 'admin' && targetLevel < roleHierarchy.admin) return true;
    
    // Other roles cannot assign roles
    return false;
};

module.exports=mongoose.model('User',userSchema);
