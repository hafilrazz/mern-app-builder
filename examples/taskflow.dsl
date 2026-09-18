app "TaskFlow" {
  database: "mongodb"
  auth: true
  port: 5000
  clientPort: 5173
}

entity User {
  name: string required
  email: string required unique
  role: enum(admin, manager, member) default(member)
}

entity Project {
  title: string required
  description: text
  status: enum(planning, active, completed, on_hold) default(planning)
  startDate: date
  endDate: date
  owner: belongsTo(User)
}

entity Task {
  title: string required
  description: text
  priority: enum(low, medium, high, urgent) default(medium)
  dueDate: date
  completed: boolean default(false)
  project: belongsTo(Project)
  assignee: belongsTo(User)
}
