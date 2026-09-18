const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { renderTemplateFile } = require('./engine');
const { generateBackend } = require('./backendGenerator');
const { generateFrontend } = require('./frontendGenerator');

const ROOT_TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'root');

/**
 * Compiles an entire fullstack project into a map of { relativePath: content }
 */
function generateProjectFiles(spec) {
  const files = {};

  // 1. Root files
  files['README.md'] = renderTemplateFile(
    path.join(ROOT_TEMPLATES_DIR, 'README.md.hbs'),
    spec
  );
  files['package.json'] = renderTemplateFile(
    path.join(ROOT_TEMPLATES_DIR, 'package.json.hbs'),
    spec
  );
  files['.gitignore'] = renderTemplateFile(
    path.join(ROOT_TEMPLATES_DIR, 'gitignore.hbs'),
    spec
  );

  // 2. Backend files
  const backendFiles = generateBackend(spec);
  Object.assign(files, backendFiles);

  // 3. Frontend files
  const frontendFiles = generateFrontend(spec);
  Object.assign(files, frontendFiles);

  return files;
}

/**
 * Writes the generated files to the file system.
 */
function writeProjectToDisk(filesMap, targetDirectory) {
  const writtenFiles = [];

  for (const [relPath, content] of Object.entries(filesMap)) {
    const fullPath = path.join(targetDirectory, relPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    writtenFiles.push(fullPath);
  }

  return writtenFiles;
}

/**
 * Streams the generated files into an Archiver zip stream.
 * Returns the archiver archive instance.
 */
function createProjectZipStream(filesMap) {
  const archive = archiver('zip', {
    zlib: { level: 9 } // Best compression
  });

  for (const [relPath, content] of Object.entries(filesMap)) {
    archive.append(content, { name: relPath });
  }

  return archive;
}

module.exports = {
  generateProjectFiles,
  writeProjectToDisk,
  createProjectZipStream
};
