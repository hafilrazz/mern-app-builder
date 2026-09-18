const express = require('express');
const path = require('path');
const fs = require('fs');
const { parseDSL, naturalTextToDSL, validateSpec } = require('../parser');
const { generateProjectFiles, writeProjectToDisk, createProjectZipStream } = require('../generator');

function createStudioApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // Get sample presets
  app.get('/api/presets', (req, res) => {
    try {
      const examplesDir = path.join(__dirname, '..', '..', 'examples');
      const presets = {};

      if (fs.existsSync(examplesDir)) {
        const files = fs.readdirSync(examplesDir);
        for (const file of files) {
          if (file.endsWith('.dsl')) {
            const key = file.replace(/\.dsl$/i, '');
            presets[key] = fs.readFileSync(path.join(examplesDir, file), 'utf8');
          }
        }
      }

      res.json({ success: true, presets });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Parse DSL text into normalized AST
  app.post('/api/parse', (req, res) => {
    try {
      const { dsl } = req.body;
      if (!dsl || typeof dsl !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing DSL text in request body.' });
      }

      const { spec, warnings } = parseDSL(dsl);
      res.json({ success: true, spec, warnings });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
        details: err.details || null,
        line: err.line || null
      });
    }
  });

  // Natural Language heuristic auto-suggest (Option B)
  app.post('/api/suggest', (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing prompt text in request body.' });
      }

      const dsl = naturalTextToDSL(prompt);
      res.json({ success: true, dsl });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Direct prompt-to-website generation
  app.post('/api/prompt/generate', (req, res) => {
    try {
      const { prompt, projectName, outPath } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing prompt text in request body.' });
      }

      const dsl = naturalTextToDSL(prompt, projectName);
      const { spec: ast, warnings } = parseDSL(dsl);
      const files = generateProjectFiles(ast);

      let targetDir = null;
      if (outPath) {
        targetDir = path.resolve(outPath);
        writeProjectToDisk(files, targetDir);
      }

      res.json({
        success: true,
        dsl,
        spec: ast,
        warnings,
        fileCount: Object.keys(files).length,
        appName: ast.app.name,
        targetDir
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Preview generated project file list and selected file contents
  app.post('/api/generate/preview', (req, res) => {
    try {
      const { dsl, spec: inputSpec } = req.body;
      let ast = inputSpec;

      if (!ast && dsl) {
        const parsed = parseDSL(dsl);
        ast = parsed.spec;
      }

      if (!ast) {
        return res.status(400).json({ success: false, error: 'Provide either DSL or Spec.' });
      }

      const files = generateProjectFiles(ast);
      const fileList = Object.keys(files);

      res.json({
        success: true,
        appName: ast.app.name,
        fileCount: fileList.length,
        files: fileList,
        sampleFiles: {
          'README.md': files['README.md'],
          'backend/server.js': files['backend/server.js'],
          'frontend/src/App.jsx': files['frontend/src/App.jsx'],
          'frontend/src/services/api.js': files['frontend/src/services/api.js']
        }
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Write directly to local disk
  app.post('/api/generate/disk', (req, res) => {
    try {
      const { dsl, spec: inputSpec, outPath } = req.body;
      let ast = inputSpec;

      if (!ast && dsl) {
        const parsed = parseDSL(dsl);
        ast = parsed.spec;
      }

      if (!ast) {
        return res.status(400).json({ success: false, error: 'Provide either DSL or Spec.' });
      }

      const files = generateProjectFiles(ast);
      const targetDir = outPath
        ? path.resolve(outPath)
        : path.resolve(process.cwd(), 'output', ast.app.name.toLowerCase());

      const written = writeProjectToDisk(files, targetDir);

      res.json({
        success: true,
        targetDir,
        fileCount: written.length,
        message: `Successfully scaffolded ${written.length} files to ${targetDir}`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Stream ZIP file
  app.post('/api/generate/zip', (req, res) => {
    try {
      const { dsl, spec: inputSpec } = req.body;
      let ast = inputSpec;

      if (!ast && dsl) {
        const parsed = parseDSL(dsl);
        ast = parsed.spec;
      }

      if (!ast) {
        return res.status(400).json({ success: false, error: 'Provide either DSL or Spec.' });
      }

      const files = generateProjectFiles(ast);
      const zipFilename = `${ast.app.name.toLowerCase()}-mern-app.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

      const archive = createProjectZipStream(files);
      archive.on('error', (err) => {
        console.error('ZIP packaging error:', err);
        if (!res.headersSent) {
          res.status(500).send({ error: err.message });
        }
      });

      archive.pipe(res);
      archive.finalize();
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return app;
}

function startStudio(port = 4000) {
  const app = createStudioApp();
  const server = app.listen(port, () => {
    console.log(`====================================================`);
    console.log(`🎨 MERN App Builder Studio is running!`);
    console.log(`👉 Open http://localhost:${port} in your browser`);
    console.log(`====================================================`);
  });

  return { app, server };
}

if (require.main === module) {
  const port = process.env.PORT || 4000;
  startStudio(port);
}

module.exports = {
  createStudioApp,
  startStudio
};
