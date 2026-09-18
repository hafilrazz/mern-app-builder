/**
 * DSL Parser for MERN App Builder
 * Converts human-readable DSL into a normalized Application Specification AST.
 */

class DSLParseError extends Error {
  constructor(message, line, column) {
    super(line ? `Parse Error on line ${line}: ${message}` : `Parse Error: ${message}`);
    this.name = 'DSLParseError';
    this.line = line;
    this.column = column;
  }
}

class DSLParser {
  constructor(input = '') {
    this.raw = input;
    this.lines = input.split(/\r?\n/);
  }

  parse() {
    const spec = {
      app: {
        name: 'GeneratedApp',
        database: 'mongodb',
        auth: false,
        port: 5000,
        clientPort: 5173
      },
      entities: [],
      relations: []
    };

    let currentEntity = null;
    let inAppBlock = false;

    for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
      const lineNum = lineIndex + 1;
      let line = this.lines[lineIndex].trim();

      // Skip empty lines and full-line comments
      if (!line || line.startsWith('//') || line.startsWith('#')) {
        continue;
      }

      // Strip inline comments
      const commentIdx = line.indexOf('//');
      if (commentIdx !== -1) {
        line = line.substring(0, commentIdx).trim();
      }

      // 1. App block header: app "AppName" { or app AppName {
      const appMatch = line.match(/^app(?:\s+["']?([A-Za-z0-9_-]+)["']?)?\s*\{?$/i);
      if (appMatch) {
        inAppBlock = true;
        if (appMatch[1]) {
          spec.app.name = appMatch[1];
        }
        continue;
      }

      // 2. Closing brace
      if (line === '}') {
        if (inAppBlock) {
          inAppBlock = false;
        } else if (currentEntity) {
          spec.entities.push(currentEntity);
          currentEntity = null;
        }
        continue;
      }

      // Inside app block
      if (inAppBlock) {
        // e.g. name: "My App"
        const nameMatch = line.match(/^name\s*:\s*["']?([A-Za-z0-9 _-]+)["']?$/i);
        if (nameMatch) {
          spec.app.name = nameMatch[1].trim().replace(/\s+/g, '');
          continue;
        }
        // e.g. database: "mongodb" or database: sqlite
        const dbMatch = line.match(/^database\s*:\s*["']?([A-Za-z0-9_-]+)["']?$/i);
        if (dbMatch) {
          spec.app.database = dbMatch[1].toLowerCase();
          continue;
        }
        // e.g. auth: true / false
        const authMatch = line.match(/^auth\s*:\s*(true|false)$/i);
        if (authMatch) {
          spec.app.auth = authMatch[1].toLowerCase() === 'true';
          continue;
        }
        // e.g. port: 5000
        const portMatch = line.match(/^port\s*:\s*(\d+)$/i);
        if (portMatch) {
          spec.app.port = parseInt(portMatch[1], 10);
          continue;
        }
        continue;
      }

      // 3. Standalone auth config: auth: true
      const rootAuthMatch = line.match(/^auth\s*:\s*(enabled|true|disabled|false)$/i);
      if (rootAuthMatch) {
        spec.app.auth = (rootAuthMatch[1].toLowerCase() === 'true' || rootAuthMatch[1].toLowerCase() === 'enabled');
        continue;
      }

      // 4. Standalone relation: relation Post belongsTo User
      const relationMatch = line.match(/^relation\s+([A-Za-z0-9_]+)\s+(belongsTo|hasMany|hasOne)\s+([A-Za-z0-9_]+)(?:\s+as\s+([A-Za-z0-9_]+))?$/i);
      if (relationMatch) {
        const [, source, type, target, alias] = relationMatch;
        spec.relations.push({
          source,
          type: type.toLowerCase() === 'belongsto' ? 'belongsTo' : (type.toLowerCase() === 'hasmany' ? 'hasMany' : 'hasOne'),
          target,
          alias: alias || (type.toLowerCase() === 'belongsto' ? target.toLowerCase() : target.toLowerCase() + 's'),
          line: lineNum
        });
        continue;
      }

      // 5. Entity block header: entity User {
      const entityMatch = line.match(/^entity\s+([A-Za-z0-9_]+)\s*\{?$/i);
      if (entityMatch) {
        if (currentEntity) {
          throw new DSLParseError(`Unexpected new entity '${entityMatch[1]}' before closing previous entity '${currentEntity.name}'`, lineNum);
        }
        currentEntity = {
          name: entityMatch[1],
          fields: [],
          relations: [],
          line: lineNum
        };
        continue;
      }

      // 6. Inside entity: Field definition
      // e.g. title: string required
      // e.g. status: enum(draft, published) default(draft)
      // e.g. author: belongsTo(User)
      // e.g. price: number default(0) min(0)
      if (currentEntity) {
        const field = this.parseFieldLine(line, lineNum, currentEntity);
        if (field) {
          if (field.isRelation) {
            currentEntity.relations.push(field);
          } else {
            currentEntity.fields.push(field);
          }
        }
        continue;
      }

      // Unrecognized root statement
      throw new DSLParseError(`Unrecognized statement: "${line}"`, lineNum);
    }

    if (currentEntity) {
      // Auto-close if missing final brace
      spec.entities.push(currentEntity);
    }

    return spec;
  }

  parseFieldLine(line, lineNum, currentEntity) {
    // Format: name: type [modifiers...]
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      throw new DSLParseError(`Expected field format 'fieldName: type [modifiers]', got: "${line}"`, lineNum);
    }

    const fieldName = line.substring(0, colonIdx).trim();
    const rest = line.substring(colonIdx + 1).trim();

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
      throw new DSLParseError(`Invalid field name '${fieldName}'`, lineNum);
    }

    // Check for relation inside field: author: belongsTo(User) or comments: hasMany(Comment)
    const relMatch = rest.match(/^(belongsTo|hasMany|hasOne)\s*\(\s*([A-Za-z0-9_]+)\s*\)(.*)$/i);
    if (relMatch) {
      const type = relMatch[1].toLowerCase() === 'belongsto' ? 'belongsTo' : (relMatch[1].toLowerCase() === 'hasmany' ? 'hasMany' : 'hasOne');
      const target = relMatch[2];
      const mods = relMatch[3].trim();
      const required = /\brequired\b/i.test(mods);

      return {
        isRelation: true,
        name: fieldName,
        type,
        target,
        required,
        line: lineNum
      };
    }

    // Check for enum: category: enum(tech, news, sports) [modifiers]
    const enumMatch = rest.match(/^enum\s*\(([^)]+)\)(.*)$/i);
    let type = 'string';
    let enumValues = null;
    let modifiersStr = '';

    if (enumMatch) {
      type = 'enum';
      enumValues = enumMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      modifiersStr = enumMatch[2].trim();
    } else {
      // General field: type [modifiers]
      const parts = rest.split(/\s+/);
      type = parts[0].toLowerCase();
      modifiersStr = parts.slice(1).join(' ').trim();
    }

    // Parse modifiers: required, unique, default(...), min(...), max(...)
    const required = /\brequired\b/i.test(modifiersStr);
    const unique = /\bunique\b/i.test(modifiersStr);

    let defaultValue = null;
    const defaultMatch = modifiersStr.match(/default\s*\(\s*([^)]+)\s*\)/i);
    if (defaultMatch) {
      defaultValue = defaultMatch[1].trim().replace(/^['"]|['"]$/g, '');
    }

    let min = null;
    const minMatch = modifiersStr.match(/min\s*\(\s*([^)]+)\s*\)/i);
    if (minMatch) {
      min = Number(minMatch[1]);
    }

    let max = null;
    const maxMatch = modifiersStr.match(/max\s*\(\s*([^)]+)\s*\)/i);
    if (maxMatch) {
      max = Number(maxMatch[1]);
    }

    return {
      isRelation: false,
      name: fieldName,
      type,
      enumValues,
      required,
      unique,
      defaultValue,
      min,
      max,
      line: lineNum
    };
  }
}

module.exports = {
  DSLParser,
  DSLParseError
};
