const path = require('path');
const { renderTemplateFile } = require('./engine');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'backend');

/**
 * Generates all backend files from an AppSpec
 * Returns a map of relative path to file content.
 */
function generateBackend(spec) {
  const files = {};

  // 1. package.json & env
  files['backend/package.json'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'package.json.hbs'),
    spec
  );
  files['backend/.env.example'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'env.hbs'),
    spec
  );
  files['backend/.env'] = files['backend/.env.example'];

  // 2. server.js
  files['backend/server.js'] = renderTemplateFile(
    path.join(TEMPLATES_DIR, 'server.js.hbs'),
    spec
  );

  // 3. Auth files (if auth enabled)
  if (spec.app.auth) {
    files['backend/middleware/auth.js'] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'authMiddleware.js.hbs'),
      spec
    );
    files['backend/controllers/authController.js'] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'authController.js.hbs'),
      spec
    );
    files['backend/routes/authRoutes.js'] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'authRoutes.js.hbs'),
      spec
    );
  }

  // 4. Entity-specific models, controllers, routes
  for (const entity of spec.entities) {
    const isAuthUser = Boolean(spec.app.auth && entity.name.toLowerCase() === 'user');
    const hasBelongsTo = (entity.relations || []).some(r => r.type === 'belongsTo');
    const searchableFields = (entity.fields || []).filter(f => f.type === 'string' || f.type === 'text');

    const entityContext = {
      app: spec.app,
      entity,
      isAuthUser,
      hasBelongsTo,
      searchableFields
    };

    const capitalizedName = entity.name.charAt(0).toUpperCase() + entity.name.slice(1);
    const camelName = entity.name.charAt(0).toLowerCase() + entity.name.slice(1);

    // Model
    files[`backend/models/${capitalizedName}.js`] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'model.js.hbs'),
      entityContext
    );

    // Controller
    files[`backend/controllers/${camelName}Controller.js`] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'controller.js.hbs'),
      entityContext
    );

    // Route
    files[`backend/routes/${camelName}Routes.js`] = renderTemplateFile(
      path.join(TEMPLATES_DIR, 'route.js.hbs'),
      entityContext
    );
  }

  return files;
}

module.exports = {
  generateBackend
};
