app "QuickShop" {
  database: "mongodb"
  auth: true
  port: 5000
  clientPort: 5173
}

entity User {
  name: string required
  email: string required unique
  address: text
  role: enum(admin, customer) default(customer)
}

entity Category {
  name: string required unique
  description: text
}

entity Product {
  name: string required
  sku: string required unique
  description: text
  price: number required min(0)
  stock: number default(0) min(0)
  inStock: boolean default(true)
  category: belongsTo(Category)
}

entity Order {
  orderNumber: string required unique
  totalAmount: number required min(0)
  status: enum(pending, paid, shipped, delivered, cancelled) default(pending)
  orderDate: date
  customer: belongsTo(User)
}
