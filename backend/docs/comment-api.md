# Comment API Documentation

## Overview
The Comment API provides comprehensive functionality for managing threaded discussions, including comment creation, editing, moderation, and engagement features.

## Base URL
```
/api/comments
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- Comment creation: 10 requests per 15 minutes
- Like actions: 30 requests per minute
- General API: 100 requests per 15 minutes

## Endpoints

### 1. Create Comment
**POST** `/api/comments`

Create a new comment on an issue.

#### Request Body
```json
{
  "issueId": "string (required)",
  "content": "string (required, 10-1000 chars)",
  "commentType": "string (optional: public|internal|private)",
  "parentComment": "string (optional, for replies)",
  "metadata": {
    "source": "string (optional: web|mobile|api)"
  }
}
```

#### Response
```json
{
  "success": true,
  "comment": {
    "_id": "string",
    "issueId": "string",
    "content": "string",
    "author": {
      "_id": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "role": "string",
      "avatar": "string"
    },
    "commentType": "string",
    "threadLevel": "number",
    "status": "string",
    "engagement": {
      "likes": [],
      "replies": 0,
      "views": 0
    },
    "createdAt": "string",
    "updatedAt": "string"
  },
  "message": "Comment created successfully"
}
```

#### Permissions
- `public`: All authenticated users
- `internal`: Department, Admin, Moderator only
- `private`: Admin, Moderator only

---

### 2. Get Issue Comments
**GET** `/api/comments/issue/:issueId`

Retrieve all comments for a specific issue with threading.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `sortBy` (optional): Sort field (createdAt|updatedAt|likes)
- `sortOrder` (optional): Sort direction (1|-1|asc|desc)
- `commentType` (optional): Filter by type (public|internal|private)

#### Response
```json
{
  "success": true,
  "comments": [
    {
      "_id": "string",
      "content": "string",
      "author": { /* author object */ },
      "commentType": "string",
      "threadLevel": 0,
      "replies": [
        {
          "_id": "string",
          "content": "string",
          "author": { /* author object */ },
          "threadLevel": 1,
          "replies": []
        }
      ],
      "engagement": {
        "likes": [],
        "replies": 1,
        "views": 10
      },
      "createdAt": "string"
    }
  ],
  "count": 25,
  "pagination": {
    "page": 1,
    "limit": 50,
    "hasMore": false
  }
}
```

---

### 3. Edit Comment
**PUT** `/api/comments/:commentId`

Edit an existing comment (within 30 minutes of creation).

#### Request Body
```json
{
  "content": "string (required, 10-1000 chars)",
  "editReason": "string (optional, max 200 chars)"
}
```

#### Response
```json
{
  "success": true,
  "comment": { /* updated comment object */ },
  "message": "Comment edited successfully"
}
```

#### Permissions
- Comment author (within 30 minutes)
- Admin/Moderator (anytime)

---

### 4. Delete Comment
**DELETE** `/api/comments/:commentId`

Soft delete a comment (marks as deleted, doesn't remove).

#### Response
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

#### Permissions
- Comment author
- Admin/Moderator

---

### 5. Toggle Like
**POST** `/api/comments/:commentId/like`

Like or unlike a comment.

#### Response
```json
{
  "success": true,
  "action": "liked|unliked",
  "likeCount": 5,
  "comment": { /* updated comment object */ }
}
```

---

### 6. Flag Comment
**POST** `/api/comments/:commentId/flag`

Flag a comment for moderation.

#### Request Body
```json
{
  "reason": "string (required: spam|inappropriate|off-topic|harassment|other)"
}
```

#### Response
```json
{
  "success": true,
  "message": "Comment flagged successfully",
  "flagCount": 2
}
```

#### Notes
- Users cannot flag their own comments
- Multiple flags from same user are ignored
- Auto-hide after 3 flags

---

### 7. Moderate Comment
**POST** `/api/comments/:commentId/moderate`

Moderate a flagged comment (Admin/Moderator only).

#### Request Body
```json
{
  "action": "string (required: approved|hidden|deleted)",
  "reason": "string (optional, max 500 chars)"
}
```

#### Response
```json
{
  "success": true,
  "comment": { /* updated comment object */ },
  "message": "Comment approved successfully"
}
```

#### Permissions
- Admin, Moderator only

---

### 8. Search Comments
**GET** `/api/comments/search`

Search comments using full-text search.

#### Query Parameters
- `q` (required): Search query (min 3 chars)
- `issueId` (optional): Limit to specific issue
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

#### Response
```json
{
  "success": true,
  "comments": [ /* array of matching comments */ ],
  "count": 15,
  "query": "search term",
  "pagination": {
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

---

### 9. Get User Comments
**GET** `/api/comments/user/:userId`

Get comments by a specific user.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

#### Response
```json
{
  "success": true,
  "comments": [ /* array of user comments */ ],
  "count": 10,
  "pagination": {
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

#### Permissions
- Users can only view their own comments
- Admin/Moderator can view any user's comments

---

### 10. Get Flagged Comments
**GET** `/api/comments/flagged`

Get flagged comments for moderation (Admin/Moderator only).

#### Query Parameters
- `status` (optional): Filter by status (pending|moderated|all)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

#### Response
```json
{
  "success": true,
  "comments": [
    {
      "_id": "string",
      "content": "string",
      "author": { /* author object */ },
      "moderation": {
        "flaggedBy": [
          {
            "userId": "string",
            "reason": "string",
            "flaggedAt": "string"
          }
        ],
        "moderatedBy": "string",
        "moderatedAt": "string",
        "moderationAction": "string"
      }
    }
  ],
  "count": 5,
  "pagination": {
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

#### Permissions
- Admin, Moderator only

---

### 11. Get Comment Statistics
**GET** `/api/comments/statistics`

Get comment analytics and statistics.

#### Query Parameters
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `issueId` (optional): Limit to specific issue
- `userId` (optional): Limit to specific user

#### Response
```json
{
  "success": true,
  "statistics": [
    {
      "_id": "public",
      "totalComments": 150,
      "totalLikes": 45,
      "totalReplies": 30,
      "dailyBreakdown": [
        {
          "date": "2024-01-15",
          "count": 10,
          "likes": 5,
          "replies": 3
        }
      ]
    }
  ]
}
```

#### Permissions
- Admin, Moderator, Department only

---

### 12. Create Reply
**POST** `/api/comments/:commentId/reply`

Create a reply to an existing comment.

#### Request Body
```json
{
  "content": "string (required, 10-1000 chars)",
  "commentType": "string (optional: public|internal|private)"
}
```

#### Response
```json
{
  "success": true,
  "comment": { /* new reply comment object */ },
  "message": "Reply created successfully"
}
```

#### Notes
- Automatically sets parentComment and issueId
- Inherits thread level from parent (max 5 levels)
- Same permission rules as regular comments

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "content",
      "message": "Comment must be between 10 and 1000 characters",
      "value": "hi"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### Permission Error (403)
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

### Rate Limit Error (429)
```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "retryAfter": 900,
  "limit": 10,
  "windowMs": 900000
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Comment Object Schema

### Full Comment Object
```json
{
  "_id": "string",
  "issueId": "string",
  "content": "string",
  "author": {
    "_id": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "role": "string",
    "avatar": "string"
  },
  "parentComment": "string|null",
  "threadLevel": "number",
  "commentType": "string",
  "status": "string",
  "moderation": {
    "flaggedBy": [
      {
        "userId": "string",
        "reason": "string",
        "flaggedAt": "string"
      }
    ],
    "moderatedBy": "string",
    "moderatedAt": "string",
    "moderationReason": "string",
    "moderationAction": "string"
  },
  "editHistory": [
    {
      "previousContent": "string",
      "editedBy": "string",
      "editedAt": "string",
      "editReason": "string"
    }
  ],
  "engagement": {
    "likes": [
      {
        "userId": "string",
        "likedAt": "string"
      }
    ],
    "replies": "number",
    "views": "number"
  },
  "attachments": [
    {
      "filename": "string",
      "originalName": "string",
      "mimeType": "string",
      "size": "number",
      "url": "string",
      "uploadedAt": "string"
    }
  ],
  "mentions": [
    {
      "userId": "string",
      "mentionType": "string",
      "notified": "boolean"
    }
  ],
  "metadata": {
    "ipAddress": "string",
    "userAgent": "string",
    "source": "string",
    "isResolution": "boolean",
    "isUpdate": "boolean"
  },
  "createdAt": "string",
  "updatedAt": "string",
  "isEdited": "boolean (virtual)",
  "isFlagged": "boolean (virtual)",
  "likeCount": "number (virtual)",
  "replyCount": "number (virtual)"
}
```

---

## Usage Examples

### Create a Public Comment
```javascript
const response = await fetch('/api/comments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    issueId: '507f1f77bcf86cd799439011',
    content: 'This is a great suggestion! I think we should implement this feature.',
    commentType: 'public'
  })
});
```

### Reply to a Comment
```javascript
const response = await fetch('/api/comments/507f1f77bcf86cd799439012/reply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    content: 'I agree with your point about the implementation.',
    commentType: 'public'
  })
});
```

### Search Comments
```javascript
const response = await fetch('/api/comments/search?q=implementation&limit=10', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

### Get Issue Comments with Threading
```javascript
const response = await fetch('/api/comments/issue/507f1f77bcf86cd799439011?sortBy=createdAt&sortOrder=desc', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```