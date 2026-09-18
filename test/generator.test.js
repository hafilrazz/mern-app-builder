const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseDSL } = require('../src/parser');
const { generateProjectFiles, writeProjectToDisk } = require('../src/generator');

describe('Fullstack Code Generator', () => {
  const sampleDSL = `
    app "TaskFlow" {
      database: "mongodb"
      auth: true
      port: 5001
      clientPort: 5174
    }

    entity Project {
      title: string required
      description: text
      status: enum(planning, active, completed) default(active)
    }

    entity Task {
      title: string required
      dueDate: date
      completed: boolean default(false)
      project: belongsTo(Project)
    }
  `;

  it('should generate complete backend and frontend file tree', () => {
    const { spec } = parseDSL(sampleDSL);
    const files = generateProjectFiles(spec);

    // Root files
    assert.ok(files['README.md']);
    assert.ok(files['package.json']);

    // Backend files
    assert.ok(files['backend/package.json']);
    assert.ok(files['backend/server.js']);
    assert.ok(files['backend/.env']);
    assert.ok(files['backend/models/Project.js']);
    assert.ok(files['backend/models/Task.js']);
    assert.ok(files['backend/models/User.js']); // Auto-included due to auth: true
    assert.ok(files['backend/controllers/projectController.js']);
    assert.ok(files['backend/controllers/taskController.js']);
    assert.ok(files['backend/routes/projectRoutes.js']);
    assert.ok(files['backend/routes/taskRoutes.js']);
    assert.ok(files['backend/middleware/auth.js']);
    assert.ok(files['backend/controllers/authController.js']);

    // Frontend files
    assert.ok(files['frontend/package.json']);
    assert.ok(files['frontend/vite.config.js']);
    assert.ok(files['frontend/src/App.jsx']);
    assert.ok(files['frontend/src/services/api.js']);
    assert.ok(files['frontend/src/context/AuthContext.jsx']);
    assert.ok(files['frontend/src/pages/DashboardPage.jsx']);
    assert.ok(files['frontend/src/pages/ProjectListPage.jsx']);
    assert.ok(files['frontend/src/pages/ProjectFormPage.jsx']);
    assert.ok(files['frontend/src/pages/ProjectDetailPage.jsx']);
    assert.ok(files['frontend/src/pages/TaskListPage.jsx']);
    assert.ok(files['frontend/src/pages/LoginPage.jsx']);
    assert.ok(files['frontend/src/pages/RegisterPage.jsx']);

    // Content checks
    assert.ok(files['backend/server.js'].includes('TaskFlow API Server running'));
    assert.ok(files['backend/models/Task.js'].includes('project: {'));
    assert.ok(files['backend/models/Task.js'].includes("ref: 'Project'"));
    assert.ok(files['frontend/src/App.jsx'].includes('ProjectListPage'));
    assert.ok(files['frontend/src/services/api.js'].includes('projectApi'));
    assert.ok(files['frontend/src/services/api.js'].includes('taskApi'));
  });

  it('should write files to target disk directory properly', () => {
    const { spec } = parseDSL(sampleDSL);
    const files = generateProjectFiles(spec);
    const tmpOut = path.join(__dirname, '..', 'scratch', 'test-output');

    const written = writeProjectToDisk(files, tmpOut);
    assert.ok(written.length > 15);
    assert.ok(fs.existsSync(path.join(tmpOut, 'backend', 'server.js')));
    assert.ok(fs.existsSync(path.join(tmpOut, 'frontend', 'src', 'App.jsx')));

    // Cleanup scratch test directory
    fs.rmSync(tmpOut, { recursive: true, force: true });
  });
});
