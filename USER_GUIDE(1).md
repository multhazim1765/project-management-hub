# Project Management Application - User Guide

## Task Management

### Creating Tasks with Assignment

When creating a new task, you can now:

1. **Navigate to** any project's Tasks page
2. **Click** "New Task" button
3. **Fill in the form:**
   - **Title** (required)
   - **Description** (optional)
   - **Priority** (Low, Medium, High, Urgent)
   - **Assign To** - Select one or more team members (checkbox list)
   - **Due Date** (optional)
   - **Estimated Hours** (optional)

4. **Click** "Create Task"

The assignees will be notified automatically via the notification system.

### Task Assignment After Creation

You can also assign tasks after creation:
1. Open the task details page
2. Use the "Assign" button or dropdown
3. Select team members to assign

---

## Getting Started

### Creating Your First Super Admin Account

**How to Become a Super Admin:**
1. Go to the registration page: `http://localhost:5173/register`
2. Fill in your details:
   - First Name
   - Last Name
   - Email
   - Password
   - Organization Name (optional - defaults to "Your Name's Workspace")
3. Click "Register"
4. You are now automatically a **Super Admin** of your new organization!

**Note:** The first user to register creates a new organization and becomes its Super Admin automatically. There is no role selection during registration.

### Logging In

After registration:
1. Go to `http://localhost:5173/login`
2. Enter your email and password
3. Email verification is auto-approved in development mode

---

## User Role Management

### Accessing User Management

**URL:** `http://localhost:5173/organization/users`

**Navigation:**
- Sidebar → Organization Section → "User Management"
- Or directly visit the URL above

### Setting/Changing User Roles

1. Go to **User Management** page
2. Find the user in the list
3. Click the **Role dropdown** next to their name
4. Select new role:
   - **Super Admin** - Full access to organization settings, can manage all projects
   - **Project Admin** - Can create and manage projects
   - **Project Manager** - Can manage assigned projects
   - **Team Member** - Regular access, can be assigned tasks
   - **Client** - Read-only access via client portal

5. Role is **saved automatically** on selection

### User Management Features

- **Search users** - Use search bar to find by name or email
- **Filter by role** - Dropdown to filter users by role
- **Activate/Deactivate** - Toggle user access without deleting
- **View user details** - Avatar, name, email, join date

---

## Organization Settings

### Accessing Organization Settings

**URL:** `http://localhost:5173/organization/settings`

**Navigation:**
- Sidebar → Organization Section → "Organization Settings"
- Or directly visit the URL above

### What You Can Configure

**General Tab:**
- Organization name
- Description
- Website URL
- Industry
- Company size
- Logo upload

**Settings Tab:**
- Default timezone
- Date format (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)
- Time format (12-hour or 24-hour)
- Week starts on (Sunday or Monday)
- Allow client access (enable/disable client portal)

---

## Feature Overview

### ✅ Completed Features

**Project Management:**
- Create, edit, delete projects
- Project templates
- Project phases
- Team member management

**Task Management:**
- Multiple views: List, Kanban, Calendar
- Task assignment (single or multiple assignees)
- Subtasks with progress tracking
- Task dependencies
- Priority and labels
- Due dates and time estimates

**Time Tracking:**
- Weekly timesheet grid
- Active timer widget
- Time entry approval workflow
- Billable hours tracking

**Document Management:**
- File uploads and downloads
- Folder organization
- Version control
- Document search

**Reports & Analytics:**
- Project progress reports
- Time utilization analytics
- Task metrics
- Export to PDF/CSV

**Organization:**
- User management
- Role assignment
- Organization settings
- User activation/deactivation

---

## Quick Tips

### Task Assignment
- You can assign tasks to **multiple people** simultaneously
- Assignees receive **automatic notifications**
- You can **reassign tasks** at any time

### Role Hierarchy
```
Super Admin > Project Admin > Project Manager > Team Member > Client
```

### Best Practices
1. **Assign specific roles** based on responsibility
2. **Use Project Manager role** for team leads
3. **Use Client role** for external stakeholders
4. **Deactivate users** instead of deleting (preserves history)
5. **Set due dates** for better planning
6. **Use subtasks** to break down complex tasks

---

## Common Questions

**Q: Can I assign a task to someone outside the project?**
A: No, only project members can be assigned tasks. Add them to the project first.

**Q: How do I make someone a manager?**
A: Go to Organization → User Management, find the user, change role to "Project Manager" or "Project Admin".

**Q: Can clients create tasks?**
A: No, clients have read-only access. They can only view project progress.

**Q: Where can I see who's assigned to a task?**
A: On the task card (list/kanban view) or in the task details page.

**Q: Can I remove an assignment?**
A: Yes, open the task and uncheck the assignee or use the assign/unassign options.

---

## Support & Troubleshooting

If you encounter issues:
1. Check the browser console for errors (F12)
2. Verify you have the correct permissions/role
3. Ensure you're part of the project (for task assignment)
4. Check if the backend server is running

---

Last Updated: Phase 3 Complete
