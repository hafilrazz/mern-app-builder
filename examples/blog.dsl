app "BlogSphere" {
  database: "mongodb"
  auth: true
  port: 5000
  clientPort: 5173
}

entity User {
  name: string required
  email: string required unique
  bio: text
  role: enum(admin, author, reader) default(reader)
}

entity Post {
  title: string required
  slug: string required unique
  content: text required
  views: number default(0)
  published: boolean default(false)
  category: enum(tech, design, business, lifestyle) default(tech)
  publishDate: date
  author: belongsTo(User)
}

entity Comment {
  content: text required
  approved: boolean default(true)
  post: belongsTo(Post)
  author: belongsTo(User)
}
