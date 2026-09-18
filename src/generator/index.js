const { generateProjectFiles, writeProjectToDisk, createProjectZipStream } = require('./scaffolder');
const { generateBackend } = require('./backendGenerator');
const { generateFrontend } = require('./frontendGenerator');
const { renderTemplate, renderTemplateFile } = require('./engine');

module.exports = {
  generateProjectFiles,
  writeProjectToDisk,
  createProjectZipStream,
  generateBackend,
  generateFrontend,
  renderTemplate,
  renderTemplateFile
};
