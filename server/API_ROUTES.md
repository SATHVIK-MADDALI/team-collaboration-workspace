# Team Collaboration Workspace API

Base URL:

```txt
http://localhost:5000
```

Protected routes require this header:

```txt
Authorization: Bearer <token>
```

## Auth

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Workspaces

```txt
POST   /api/workspaces
GET    /api/workspaces
GET    /api/workspaces/:id
PUT    /api/workspaces/:id
DELETE /api/workspaces/:id
POST   /api/workspaces/:id/members
DELETE /api/workspaces/:id/members/:userId
```

## Tasks

```txt
POST   /api/workspaces/:workspaceId/tasks
GET    /api/workspaces/:workspaceId/tasks
GET    /api/workspaces/:workspaceId/tasks/stats
GET    /api/workspaces/:workspaceId/tasks/:taskId
PUT    /api/workspaces/:workspaceId/tasks/:taskId
DELETE /api/workspaces/:workspaceId/tasks/:taskId
```

## Messages

```txt
POST /api/workspaces/:workspaceId/messages
GET  /api/workspaces/:workspaceId/messages
```

## Notifications

```txt
GET /api/notifications
PUT /api/notifications/read-all
PUT /api/notifications/:id/read
```

## Socket.io Events

Client emits:

```txt
joinUser
joinWorkspace
leaveWorkspace
```

Server emits:

```txt
taskCreated
taskUpdated
taskDeleted
messageCreated
notificationCreated
socketError
```

Socket clients should connect with the login token:

```js
io("http://localhost:5000", {
    auth: {
        token,
    },
});
```
