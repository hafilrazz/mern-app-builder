# 🛠️ MERN App Builder

A rule-driven, template-based full-stack application generator (MERN: Express + MongoDB/Mongoose + React + Tailwind CSS) built from pure computer science fundamentals without external LLM API dependencies.

---

## 🌟 Highlights

- **Rule-Driven Core**: Tokenizer, grammar parser, and schema validator convert declarative DSL specifications into an unambiguous AST (`AppSpec`).
- **Heuristic NLP Auto-Suggester (Option B)**: Translates natural language prompts (e.g. *"Users have name and email. Posts have title, content and belong to User."*) into formatted DSL.
- **Production-Ready Backend**:
  - Express.js REST API with route handlers, error middleware, and healthchecks
  - Mongoose models with validation rules (min, max, enum, required, unique, default)
  - Full CRUD controllers with pagination, text search, sorting, and foreign reference `.populate()`
  - Complete JWT + Bcrypt authentication module (register, login, me, protected routes)
- **Modern React Frontend**:
  - Vite + React 18 + Tailwind CSS
  - Type-aware forms (string, textarea, number, boolean toggle, date picker, enum dropdown, relational foreign entity dropdown)
  - Searchable list tables with pagination, view/edit/delete actions
  - Responsive Dashboard with entity metric cards and system health monitor
  - AuthContext and ProtectedRoute state management
- **Dual Interfaces**:
  - **CLI**: Commands to parse, suggest, initialize, generate, and package
  - **Web Studio UI**: Local visual schema builder + real-time DSL editor + one-click ZIP download and folder export

---

## ⚡ 1-Click: Generate a Fresh Website On Prompt

You can name the project yourself or provide it via `--name`:

```bash
# Provide your custom project name:
node bin/cli.js prompt "gym website with trainers, classes, and membership plans" --name "AlphaFitness"
node bin/cli.js prompt "restaurant website with menu items and reservations" --name "LuigiPizza"
node bin/cli.js prompt "doctor clinic website with doctors and appointments" --name "CityCare"
node bin/cli.js prompt "portfolio website for a UI designer with projects" --name "AlexStudio"

# If you omit --name in the terminal, it will ask you interactively:
# 🏷️ Enter your custom project name:
node bin/cli.js prompt "sneakers e-commerce store with orders and cart"
```
It immediately:
1. Names your project strictly according to your choice.
2. Synthesizes a complete Express backend + modern React/Tailwind frontend.
3. Generates a comprehensive `README.md` documenting what the project does, step-by-step run instructions, UI guide, and full REST API catalog with sample cURL commands.
4. Writes the project to `./output/<project-name>` and packages a `.zip` archive!

### 2. Launch the Web Studio UI
Run the interactive studio locally:
```bash
npm run studio
# or: node bin/cli.js studio --port 4000
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser to visually build schemas, edit DSL, and download generated `.zip` projects with one click!

### 3. Using the CLI
Generate an app directly from terminal:
```bash
# Generate app from DSL file to local directory and create a .zip archive
node bin/cli.js generate --spec ./examples/taskflow.dsl --out ./my-tasks --zip ./my-tasks.zip

# Parse and validate DSL syntax, outputting the JSON AST
node bin/cli.js parse --spec ./examples/blog.dsl

# Convert natural language text to DSL using rule-based NLP
node bin/cli.js suggest --prompt "Users have name and email. Products have title, price and belong to Category."

# Create a starter DSL template
node bin/cli.js init myapp
```

---

## 📝 DSL Specification Syntax

Write declarative specifications in `.dsl` files:

```dsl
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
```

### Supported Field Types & Modifiers
| Type | Description | Frontend Control | Mongoose Schema |
|---|---|---|---|
| `string` | Single line text | `<input type="text">` | `String` (trimmed) |
| `text` | Multi-line text | `<textarea rows="4">` | `String` |
| `number` | Integer or float | `<input type="number">` | `Number` |
| `boolean` | Boolean flag | Toggle / Checkbox | `Boolean` |
| `date` | Date | `<input type="date">` | `Date` |
| `enum(a, b, c)` | Fixed choices | `<select>` dropdown | `String` with enum validation |
| `belongsTo(Entity)` | Foreign reference | Async `<select>` querying related entity | `ObjectId` with `ref` |

**Modifiers**: `required`, `unique`, `default(val)`, `min(n)`, `max(n)`.

---

## 📁 Generated Project Structure

Each generated application is structured as follows:

```
my-app/
├── README.md                     # Setup instructions & API catalog
├── package.json                  # Root runner script
├── backend/
│   ├── package.json              # Express, Mongoose, JWT, Bcrypt
│   ├── .env.example / .env       # Database URI & port configuration
│   ├── server.js                 # Entry point with healthcheck & 404/error handling
│   ├── models/                   # Mongoose schemas (e.g. User.js, Project.js, Task.js)
│   ├── controllers/              # CRUD controllers with search & populate
│   ├── routes/                   # Express routes
│   └── middleware/               # JWT authentication middleware
└── frontend/
    ├── package.json              # Vite, React 18, Tailwind CSS, Lucide
    ├── vite.config.js            # API proxy configuration
    ├── tailwind.config.js        # Theme and layout
    ├── index.html
    └── src/
        ├── main.jsx              # React root
        ├── App.jsx               # React Router & protected routes
        ├── services/api.js       # Axios client with JWT interceptors
        ├── context/AuthContext.jsx # Authentication state
        ├── components/           # Navbar, Sidebar, modals
        └── pages/                # Dashboard, List, Form, Detail, Login, Register
```

---

## 🧪 Running Tests

The generator includes a full automated test suite verifying parser tokens, schema validation, template rendering, and studio API endpoints:

```bash
npm test
```

---

## 📄 License
MIT
