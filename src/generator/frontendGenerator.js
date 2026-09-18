const path = require('path');
const { renderTemplateFile } = require('./engine');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'frontend');

/**
 * Generates all frontend files from an AppSpec
 * Returns a map of relative path to file content.
 */
function generateFrontend(spec) {
  const files = {};

  // Root configuration files
  files['frontend/package.json'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'package.json.hbs'),
    spec
  );
  files['frontend/vite.config.js'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'vite.config.js.hbs'),
    spec
  );
  files['frontend/tailwind.config.js'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'tailwind.config.js.hbs'),
    spec
  );
  files['frontend/postcss.config.js'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'postcss.config.js.hbs'),
    spec
  );
  files['frontend/index.html'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'index.html.hbs'),
    spec
  );
  files['frontend/.env.example'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'env.hbs'),
    spec
  );
  files['frontend/.env'] = files['frontend/.env.example'];

  // Core React source files
  files['frontend/src/index.css'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'src', 'index.css.hbs'),
    spec
  );
  files['frontend/src/main.jsx'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'src', 'main.jsx.hbs'),
    spec
  );
  files['frontend/src/App.jsx'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'src', 'App.jsx.hbs'),
    spec
  );
  files['frontend/src/services/api.js'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'src', 'services', 'api.js.hbs'),
    spec
  );

  // Components
  files['frontend/src/components/Navbar.jsx'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'src', 'components', 'Navbar.jsx.hbs'),
    spec
  );
  files['frontend/src/components/Sidebar.jsx'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'src', 'components', 'Sidebar.jsx.hbs'),
    spec
  );

  // Pages
  files['frontend/src/pages/DashboardPage.jsx'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'src', 'pages', 'DashboardPage.jsx.hbs'),
    spec
  );

  // Auth (if enabled)
  if (spec.app.auth) {
    files['frontend/src/context/AuthContext.jsx'] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'src', 'context', 'AuthContext.jsx.hbs'),
      spec
    );
    files['frontend/src/pages/LoginPage.jsx'] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'src', 'pages', 'LoginPage.jsx.hbs'),
      spec
    );
    files['frontend/src/pages/RegisterPage.jsx'] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'src', 'pages', 'RegisterPage.jsx.hbs'),
      spec
    );
  }

  // Entity pages (List, Form, Detail)
  for (const entity of spec.entities) {
    const capitalizedName = entity.name.charAt(0).toUpperCase() + entity.name.slice(1);
    const totalColumns = (entity.fields.length || 0) + (entity.relations.length || 0) + 1;

    const entityContext = {
      app: spec.app,
      entity,
      totalColumns
    };

    files[`frontend/src/pages/${capitalizedName}ListPage.jsx`] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'src', 'pages', 'EntityListPage.jsx.hbs'),
      entityContext
    );

    files[`frontend/src/pages/${capitalizedName}FormPage.jsx`] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'src', 'pages', 'EntityFormPage.jsx.hbs'),
      entityContext
    );

    files[`frontend/src/pages/${capitalizedName}DetailPage.jsx`] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'src', 'pages', 'EntityDetailPage.jsx.hbs'),
      entityContext
    );
  }

  return files;
}

module.exports = {
  generateFrontend
};
