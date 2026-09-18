#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { parseDSL, naturalTextToDSL } = require('../src/parser');
const { generateProjectFiles, writeProjectToDisk, createProjectZipStream } = require('../src/generator');

function printHelp() {
  console.log(`
🚀 MERN App Builder - Template-Based Rule-Driven Fullstack Generator

USAGE:
  mern-builder <command> [options]

COMMANDS:
  prompt <description>  ⚡ Instantly generate a fresh website & fullstack app from a prompt!
  generate              Generate a fullstack MERN application (from --spec file or --prompt)
  parse                 Parse and validate a DSL file, printing the normalized JSON AST
  suggest               Convert natural language text into a DSL specification
  init [name]           Generate a sample starter DSL file in the current directory
  studio                Launch the Interactive Web Studio in your browser
  help                  Display this help message

OPTIONS:
  -n, --name <name>      Custom name for your project (e.g. MyStore, TitanGym)
  -p, --prompt "<text>"  Natural language prompt describing the website or app
  -s, --spec <file>      Path to input DSL file
  -o, --out <dir>        Target directory for generated project (default: ./output/<project-name>)
  -z, --zip [filename]   Package output as a .zip file (default: ./output/<project-name>.zip)
  --port <number>        Port for Studio server (default: 4000)

EXAMPLES:
  # ⚡ Generate a custom-named website directly from a prompt:
  mern-builder prompt "gym website with trainers and classes" --name "AlphaFitness"
  mern-builder prompt "restaurant website with menu and reservations" --name "LuigiPizza"
  mern-builder prompt "clinic with doctors and appointments" --name "CityCare"

  # If --name is omitted, you will be prompted to enter your project name:
  mern-builder prompt "e-commerce sneaker store with products and orders"

  # Or using generate:
  mern-builder generate --prompt "portfolio for UI designer" --name "MyPortfolio" --out ./portfolio
  mern-builder studio --port 4000
`);
}

function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseArgs(args) {
  const parsed = {
    command: args[0] || 'help',
    name: null,
    spec: null,
    out: null,
    zip: null,
    port: 4000,
    prompt: null,
    initName: 'myapp'
  };

  // If command is 'prompt' and next argument is not a flag, treat as prompt text
  let startIndex = 1;
  if (parsed.command === 'prompt' && args[1] && !args[1].startsWith('-')) {
    const promptWords = [];
    while (startIndex < args.length && !args[startIndex].startsWith('-')) {
      promptWords.push(args[startIndex]);
      startIndex++;
    }
    parsed.prompt = promptWords.join(' ');
  }

  for (let i = startIndex; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-n' || arg === '--name') {
      parsed.name = args[++i];
    } else if (arg === '-s' || arg === '--spec') {
      parsed.spec = args[++i];
    } else if (arg === '-o' || arg === '--out') {
      parsed.out = args[++i];
    } else if (arg === '-z' || arg === '--zip') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        parsed.zip = args[++i];
      } else {
        parsed.zip = true;
      }
    } else if (arg === '--port') {
      parsed.port = parseInt(args[++i], 10) || 4000;
    } else if (arg === '-p' || arg === '--prompt') {
      parsed.prompt = args[++i];
    } else if (!arg.startsWith('-') && parsed.command === 'init') {
      parsed.initName = arg;
    }
  }

  return parsed;
}

async function runGeneration({ dslContent, sourceDescription, out, zip }) {
  console.log(`\n🔍 Parsing and validating architecture (${sourceDescription})...`);
  const { spec: ast, warnings } = parseDSL(dslContent);

  if (warnings && warnings.length > 0) {
    warnings.forEach(w => console.log(`⚠️  ${w}`));
  }

  console.log(`⚙️  Synthesizing fullstack MERN codebase for '${ast.app.name}'...`);
  console.log(`   • Entities: ${ast.entities.map(e => `${e.name} (${e.fields.length} fields)`).join(', ')}`);
  console.log(`   • Database: ${ast.app.database.toUpperCase()} with Mongoose ODM`);
  console.log(`   • Auth: ${ast.app.auth ? 'Enabled (JWT + Bcrypt)' : 'Disabled'}`);
  console.log(`   • Frontend: Vite + React 18 + Tailwind CSS + Lucide Icons`);

  const filesMap = generateProjectFiles(ast);
  const fileCount = Object.keys(filesMap).length;

  const targetDir = out
    ? path.resolve(process.cwd(), out)
    : path.resolve(process.cwd(), 'output', ast.app.name.toLowerCase());

  console.log(`💾 Writing ${fileCount} files to: ${targetDir}`);
  writeProjectToDisk(filesMap, targetDir);

  const zipTarget = typeof zip === 'string'
    ? path.resolve(process.cwd(), zip.endsWith('.zip') ? zip : `${zip}.zip`)
    : path.resolve(process.cwd(), 'output', `${ast.app.name.toLowerCase()}.zip`);

  if (zip) {
    console.log(`📦 Packaging into ZIP archive: ${zipTarget}`);
    const output = fs.createWriteStream(zipTarget);
    const archive = createProjectZipStream(filesMap);
    archive.pipe(output);
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.finalize();
    });
  }

  console.log(`\n🎉 Success! Fresh website & fullstack app '${ast.app.name}' generated.`);
  console.log(`📁 Project location: ${targetDir}`);
  if (zip) console.log(`📦 Zip package: ${zipTarget}`);

  console.log(`\n👉 How to run your new application:`);
  console.log(`   1. cd ${path.relative(process.cwd(), targetDir) || targetDir}`);
  console.log(`   2. cd backend && npm install && npm run dev`);
  console.log(`   3. (In a second terminal) cd frontend && npm install && npm run dev`);
  console.log(`   4. Open http://localhost:${ast.app.clientPort} in your browser!`);
  console.log(`\n📖 Check ${path.join(targetDir, 'README.md')} for complete documentation.\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  let { command, name, spec, out, zip, port, prompt, initName } = parseArgs(args);

  switch (command) {
    case 'prompt': {
      if (!prompt) {
        console.error('❌ Error: Missing prompt description. Example:\n  mern-builder prompt "gym website with trainers and classes" --name "MyGym"');
        process.exit(1);
      }

      // If user did not provide a custom project name, prompt them for one
      if (!name) {
        if (process.stdin.isTTY) {
          name = await promptUser('🏷️  Enter your custom project name (e.g. MyStore, FitPulse): ');
        }
      }

      console.log(`\n🤖 Analyzing prompt: "${prompt}"...`);
      if (name) {
        console.log(`🏷️  Using custom project name: "${name}"`);
      }

      const dslContent = naturalTextToDSL(prompt, name);
      await runGeneration({
        dslContent,
        sourceDescription: 'From prompt',
        out,
        zip: zip !== null ? zip : true
      });
      break;
    }

    case 'generate': {
      let dslContent = '';
      let sourceDescription = '';

      if (prompt) {
        if (!name && process.stdin.isTTY) {
          name = await promptUser('🏷️  Enter your custom project name: ');
        }
        console.log(`\n🤖 Analyzing prompt: "${prompt}"...`);
        dslContent = naturalTextToDSL(prompt, name);
        sourceDescription = 'From prompt';
      } else if (spec) {
        const fullSpecPath = path.resolve(process.cwd(), spec);
        if (!fs.existsSync(fullSpecPath)) {
          console.error(`❌ Error: File not found: ${fullSpecPath}`);
          process.exit(1);
        }
        dslContent = fs.readFileSync(fullSpecPath, 'utf8');
        sourceDescription = spec;
      } else {
        console.error('❌ Error: Must provide either --prompt "<description>" or --spec <file.dsl>');
        process.exit(1);
      }

      try {
        await runGeneration({
          dslContent,
          sourceDescription,
          out,
          zip
        });
      } catch (err) {
        console.error(`\n❌ Generation Failed: ${err.message}`);
        if (err.details) {
          err.details.forEach(d => console.error(`   • ${d}`));
        }
        process.exit(1);
      }
      break;
    }

    case 'parse': {
      if (!spec) {
        console.error('❌ Error: Missing required option --spec <file>');
        process.exit(1);
      }
      try {
        const fullSpecPath = path.resolve(process.cwd(), spec);
        if (!fs.existsSync(fullSpecPath)) {
          console.error(`❌ Error: File not found: ${fullSpecPath}`);
          process.exit(1);
        }
        const dslContent = fs.readFileSync(fullSpecPath, 'utf8');
        const { spec: ast, warnings } = parseDSL(dslContent);

        if (warnings && warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          warnings.forEach(w => console.log(`  - ${w}`));
        }

        console.log('\n✅ Parsed Application Specification AST:');
        console.log(JSON.stringify(ast, null, 2));
      } catch (err) {
        console.error(`\n❌ ${err.message}`);
        if (err.details) {
          err.details.forEach(d => console.error(`   • ${d}`));
        }
        process.exit(1);
      }
      break;
    }

    case 'suggest': {
      if (!prompt) {
        console.error('❌ Error: Missing --prompt "<natural language description>"');
        process.exit(1);
      }
      console.log('🤖 Heuristic NLP Auto-Suggester');
      console.log('---------------------------------');
      const suggestedDSL = naturalTextToDSL(prompt, name);
      console.log(suggestedDSL);
      break;
    }

    case 'init': {
      const fileName = `${initName.replace(/\.dsl$/i, '')}.dsl`;
      const targetPath = path.resolve(process.cwd(), fileName);
      if (fs.existsSync(targetPath)) {
        console.error(`❌ Error: File '${fileName}' already exists.`);
        process.exit(1);
      }
      const template = `app "${initName}" {\n  database: "mongodb"\n  auth: true\n}\n\nentity Item {\n  title: string required\n  description: text\n  completed: boolean default(false)\n}\n`;
      fs.writeFileSync(targetPath, template, 'utf8');
      console.log(`✅ Created starter DSL file: ${fileName}`);
      console.log(`👉 Edit '${fileName}' and run: node bin/cli.js generate --spec ${fileName}`);
      break;
    }

    case 'studio': {
      console.log(`🎨 Starting MERN App Builder Studio on port ${port}...`);
      const { startStudio } = require('../src/studio/server');
      startStudio(port);
      break;
    }

    default:
      console.error(`❌ Unknown command: '${command}'`);
      printHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, parseArgs };
