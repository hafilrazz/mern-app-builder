/**
 * Heuristic NLP Parser & Domain Engine (Option B)
 * Translates natural language prompts and domain descriptions into full DSL specifications.
 */

function singularize(word) {
  if (!word) return word;
  const w = word.trim();
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && (w.endsWith('shes') || w.endsWith('ches') || w.endsWith('xes') || w.endsWith('ses'))) {
    return w.slice(0, -2);
  }
  if (w.endsWith('s') && !w.endsWith('ss')) {
    return w.slice(0, -1);
  }
  return w;
}

function capitalize(str) {
  if (!str) return '';
  const s = String(str).trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cleanIdentifier(str) {
  return str.replace(/[^a-zA-Z0-9_]/g, '');
}

function inferFieldType(rawFieldName) {
  const name = rawFieldName.toLowerCase();

  if (name.includes('email')) {
    return { type: 'string', modifiers: 'required unique' };
  }
  if (name.includes('password')) {
    return { type: 'string', modifiers: 'required' };
  }
  if (name.includes('price') || name.includes('amount') || name.includes('cost') || name.includes('total') || name.includes('fee') || name.includes('salary') || name.includes('budget')) {
    return { type: 'number', modifiers: 'default(0) min(0)' };
  }
  if (name.includes('count') || name.includes('quantity') || name.includes('views') || name.includes('age') || name.includes('rating') || name.includes('score') || name.includes('stock') || name.includes('capacity') || name.includes('duration')) {
    return { type: 'number', modifiers: 'default(0)' };
  }
  if (name.startsWith('is') || name.startsWith('has') || name === 'active' || name === 'published' || name === 'completed' || name === 'done' || name === 'instock' || name === 'available' || name === 'approved' || name === 'featured') {
    return { type: 'boolean', modifiers: 'default(false)' };
  }
  if (name.includes('date') || name.endsWith('at') || name === 'deadline' || name.includes('time') || name === 'start' || name === 'end') {
    return { type: 'date', modifiers: '' };
  }
  if (name.includes('description') || name.includes('content') || name.includes('body') || name.includes('bio') || name.includes('summary') || name.includes('text') || name.includes('notes') || name.includes('address') || name.includes('comment') || name.includes('message')) {
    return { type: 'text', modifiers: '' };
  }
  if (name === 'status') {
    return { type: 'enum(active, pending, completed, archived)', modifiers: 'default(active)' };
  }
  if (name === 'priority') {
    return { type: 'enum(low, medium, high, urgent)', modifiers: 'default(medium)' };
  }
  if (name === 'role') {
    return { type: 'enum(admin, member, guest)', modifiers: 'default(member)' };
  }
  if (name === 'category' || name === 'type') {
    return { type: 'string', modifiers: '' };
  }
  if (name === 'title' || name === 'name') {
    return { type: 'string', modifiers: 'required' };
  }

  return { type: 'string', modifiers: '' };
}

// Domain Knowledge Archetypes
const DOMAIN_ARCHETYPES = [
  {
    keywords: ['restaurant', 'cafe', 'food', 'bakery', 'dining', 'bistro', 'pizza', 'kitchen', 'menu'],
    appName: 'BistroDelight',
    auth: true,
    entities: [
      {
        name: 'Category',
        fields: [
          { name: 'name', type: 'string', modifiers: 'required unique' },
          { name: 'description', type: 'text', modifiers: '' }
        ],
        relations: []
      },
      {
        name: 'MenuItem',
        fields: [
          { name: 'name', type: 'string', modifiers: 'required' },
          { name: 'description', type: 'text', modifiers: '' },
          { name: 'price', type: 'number', modifiers: 'required min(0)' },
          { name: 'isVegetarian', type: 'boolean', modifiers: 'default(false)' },
          { name: 'isAvailable', type: 'boolean', modifiers: 'default(true)' }
        ],
        relations: [
          { name: 'category', type: 'belongsTo', target: 'Category' }
        ]
      },
      {
        name: 'Reservation',
        fields: [
          { name: 'customerName', type: 'string', modifiers: 'required' },
          { name: 'customerEmail', type: 'string', modifiers: 'required' },
          { name: 'partySize', type: 'number', modifiers: 'required min(1) default(2)' },
          { name: 'reservationDate', type: 'date', modifiers: 'required' },
          { name: 'status', type: 'enum(pending, confirmed, seated, cancelled)', modifiers: 'default(pending)' },
          { name: 'specialRequests', type: 'text', modifiers: '' }
        ],
        relations: []
      },
      {
        name: 'Review',
        fields: [
          { name: 'author', type: 'string', modifiers: 'required' },
          { name: 'rating', type: 'number', modifiers: 'required min(1) max(5) default(5)' },
          { name: 'comment', type: 'text', modifiers: 'required' }
        ],
        relations: [
          { name: 'menuItem', type: 'belongsTo', target: 'MenuItem' }
        ]
      }
    ]
  },
  {
    keywords: ['gym', 'fitness', 'workout', 'trainer', 'crossfit', 'yoga', 'athlete'],
    appName: 'FitPulse',
    auth: true,
    entities: [
      {
        name: 'Trainer',
        fields: [
          { name: 'name', type: 'string', modifiers: 'required' },
          { name: 'specialty', type: 'string', modifiers: 'required' },
          { name: 'experienceYears', type: 'number', modifiers: 'default(3)' },
          { name: 'bio', type: 'text', modifiers: '' }
        ],
        relations: []
      },
      {
        name: 'FitnessClass',
        fields: [
          { name: 'title', type: 'string', modifiers: 'required' },
          { name: 'description', type: 'text', modifiers: '' },
          { name: 'capacity', type: 'number', modifiers: 'default(20)' },
          { name: 'scheduleDate', type: 'date', modifiers: '' },
          { name: 'intensity', type: 'enum(beginner, intermediate, advanced)', modifiers: 'default(intermediate)' }
        ],
        relations: [
          { name: 'trainer', type: 'belongsTo', target: 'Trainer' }
        ]
      },
      {
        name: 'MembershipPlan',
        fields: [
          { name: 'planName', type: 'string', modifiers: 'required unique' },
          { name: 'monthlyPrice', type: 'number', modifiers: 'required min(0)' },
          { name: 'accessHours', type: 'enum(all_day, off_peak, weekend_only)', modifiers: 'default(all_day)' },
          { name: 'perks', type: 'text', modifiers: '' }
        ],
        relations: []
      }
    ]
  },
  {
    keywords: ['real estate', 'realtor', 'property', 'properties', 'house', 'apartment', 'villa', 'rental'],
    appName: 'EstateHub',
    auth: true,
    entities: [
      {
        name: 'Agent',
        fields: [
          { name: 'name', type: 'string', modifiers: 'required' },
          { name: 'email', type: 'string', modifiers: 'required unique' },
          { name: 'phone', type: 'string', modifiers: '' },
          { name: 'agency', type: 'string', modifiers: '' }
        ],
        relations: []
      },
      {
        name: 'Property',
        fields: [
          { name: 'title', type: 'string', modifiers: 'required' },
          { name: 'address', type: 'string', modifiers: 'required' },
          { name: 'price', type: 'number', modifiers: 'required min(0)' },
          { name: 'bedrooms', type: 'number', modifiers: 'default(2)' },
          { name: 'bathrooms', type: 'number', modifiers: 'default(2)' },
          { name: 'propertyType', type: 'enum(house, apartment, condo, villa)', modifiers: 'default(house)' },
          { name: 'isAvailable', type: 'boolean', modifiers: 'default(true)' },
          { name: 'description', type: 'text', modifiers: '' }
        ],
        relations: [
          { name: 'agent', type: 'belongsTo', target: 'Agent' }
        ]
      },
      {
        name: 'Inquiry',
        fields: [
          { name: 'clientName', type: 'string', modifiers: 'required' },
          { name: 'clientEmail', type: 'string', modifiers: 'required' },
          { name: 'message', type: 'text', modifiers: 'required' },
          { name: 'preferredDate', type: 'date', modifiers: '' }
        ],
        relations: [
          { name: 'property', type: 'belongsTo', target: 'Property' }
        ]
      }
    ]
  },
  {
    keywords: ['doctor', 'hospital', 'clinic', 'healthcare', 'medical', 'patient', 'appointment'],
    appName: 'MediCareHub',
    auth: true,
    entities: [
      {
        name: 'Doctor',
        fields: [
          { name: 'name', type: 'string', modifiers: 'required' },
          { name: 'specialization', type: 'string', modifiers: 'required' },
          { name: 'consultationFee', type: 'number', modifiers: 'default(100)' },
          { name: 'bio', type: 'text', modifiers: '' }
        ],
        relations: []
      },
      {
        name: 'Patient',
        fields: [
          { name: 'name', type: 'string', modifiers: 'required' },
          { name: 'email', type: 'string', modifiers: 'required unique' },
          { name: 'phone', type: 'string', modifiers: '' },
          { name: 'medicalHistory', type: 'text', modifiers: '' }
        ],
        relations: []
      },
      {
        name: 'Appointment',
        fields: [
          { name: 'appointmentDate', type: 'date', modifiers: 'required' },
          { name: 'reason', type: 'text', modifiers: 'required' },
          { name: 'status', type: 'enum(scheduled, in_progress, completed, cancelled)', modifiers: 'default(scheduled)' }
        ],
        relations: [
          { name: 'doctor', type: 'belongsTo', target: 'Doctor' },
          { name: 'patient', type: 'belongsTo', target: 'Patient' }
        ]
      }
    ]
  },
  {
    keywords: ['course', 'courses', 'education', 'learning', 'lms', 'school', 'academy', 'instructor'],
    appName: 'SkillForge',
    auth: true,
    entities: [
      {
        name: 'Instructor',
        fields: [
          { name: 'name', type: 'string', modifiers: 'required' },
          { name: 'email', type: 'string', modifiers: 'required unique' },
          { name: 'title', type: 'string', modifiers: '' },
          { name: 'bio', type: 'text', modifiers: '' }
        ],
        relations: []
      },
      {
        name: 'Course',
        fields: [
          { name: 'title', type: 'string', modifiers: 'required' },
          { name: 'description', type: 'text', modifiers: '' },
          { name: 'price', type: 'number', modifiers: 'default(0)' },
          { name: 'level', type: 'enum(beginner, intermediate, advanced)', modifiers: 'default(beginner)' }
        ],
        relations: [
          { name: 'instructor', type: 'belongsTo', target: 'Instructor' }
        ]
      },
      {
        name: 'Lesson',
        fields: [
          { name: 'title', type: 'string', modifiers: 'required' },
          { name: 'content', type: 'text', modifiers: '' },
          { name: 'durationMinutes', type: 'number', modifiers: 'default(20)' },
          { name: 'isFreePreview', type: 'boolean', modifiers: 'default(false)' }
        ],
        relations: [
          { name: 'course', type: 'belongsTo', target: 'Course' }
        ]
      }
    ]
  },
  {
    keywords: ['portfolio', 'freelancer', 'agency', 'designer', 'developer', 'showcase'],
    appName: 'CreativeStudio',
    auth: false,
    entities: [
      {
        name: 'Project',
        fields: [
          { name: 'title', type: 'string', modifiers: 'required' },
          { name: 'description', type: 'text', modifiers: '' },
          { name: 'client', type: 'string', modifiers: '' },
          { name: 'projectUrl', type: 'string', modifiers: '' },
          { name: 'category', type: 'enum(web, mobile, branding, design)', modifiers: 'default(web)' },
          { name: 'featured', type: 'boolean', modifiers: 'default(true)' }
        ],
        relations: []
      },
      {
        name: 'Service',
        fields: [
          { name: 'title', type: 'string', modifiers: 'required' },
          { name: 'description', type: 'text', modifiers: '' },
          { name: 'startingPrice', type: 'number', modifiers: 'default(500)' }
        ],
        relations: []
      },
      {
        name: 'Testimonial',
        fields: [
          { name: 'clientName', type: 'string', modifiers: 'required' },
          { name: 'clientCompany', type: 'string', modifiers: '' },
          { name: 'quote', type: 'text', modifiers: 'required' },
          { name: 'rating', type: 'number', modifiers: 'default(5)' }
        ],
        relations: []
      }
    ]
  }
];

function buildDSLString(appName, authEnabled, entities) {
  let dsl = `app "${appName}" {\n`;
  dsl += `  database: "mongodb"\n`;
  dsl += `  auth: ${authEnabled}\n`;
  dsl += `}\n\n`;

  for (const entity of entities) {
    dsl += `entity ${entity.name} {\n`;
    for (const field of entity.fields) {
      dsl += `  ${field.name}: ${field.type}${field.modifiers ? ' ' + field.modifiers : ''}\n`;
    }
    for (const rel of (entity.relations || [])) {
      dsl += `  ${rel.name}: ${rel.type}(${rel.target})\n`;
    }
    dsl += `}\n\n`;
  }

  return dsl.trim();
}

/**
 * Translates natural language prompt into a comprehensive DSL specification.
 */
function naturalTextToDSL(text, customAppName = null) {
  const lower = text.toLowerCase();

  // If user passed customAppName, respect it strictly!
  let appName = customAppName ? capitalize(cleanIdentifier(customAppName)) : null;

  if (!appName) {
    const nameMatch = text.match(/(?:app|website|project|platform|system|store)\s+(?:for|named|called)\s+([A-Za-z0-9_]+)/i);
    if (nameMatch) {
      appName = capitalize(cleanIdentifier(nameMatch[1]));
    }
  }

  // 1. Check for domain archetype match
  for (const archetype of DOMAIN_ARCHETYPES) {
    const matched = archetype.keywords.some(kw => lower.includes(kw));
    if (matched) {
      const chosenAppName = appName || archetype.appName;
      return buildDSLString(chosenAppName, archetype.auth, archetype.entities);
    }
  }

  // 2. Fallback to sentence pattern parsing
  const sentences = text
    .replace(/\r?\n/g, '. ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const entities = new Map();
  let authEnabled = /\b(auth|login|signup|jwt|authenticate|users)\b/i.test(text);

  if (!appName) {
    appName = 'MyCustomApp';
  }

  for (const sentence of sentences) {
    // "Users have name, email..." or "Products with title, price..."
    const entityMatch = sentence.match(/(?:a|an|each)?\s*([A-Za-z0-9_]+)\s+(?:has|have|contains|includes|with)\s+(.+)/i);
    if (entityMatch) {
      const rawEntity = singularize(entityMatch[1].trim());
      const entityName = capitalize(cleanIdentifier(rawEntity));

      if (!entities.has(entityName)) {
        entities.set(entityName, { name: entityName, fields: [], relations: [] });
      }
      const entityData = entities.get(entityName);

      const fieldsListStr = entityMatch[2].replace(/\band\b/gi, ',');
      const rawTokens = fieldsListStr.split(',').map(f => f.trim()).filter(Boolean);

      for (let rawToken of rawTokens) {
        rawToken = rawToken.replace(/^(a|an|the|its|their|optional)\s+/i, '').trim();

        const inlineBelongs = rawToken.match(/^belong(?:s|ing)?\s+to\s+([A-Za-z0-9_]+)/i);
        if (inlineBelongs) {
          const target = capitalize(singularize(cleanIdentifier(inlineBelongs[1].trim())));
          entityData.relations.push({
            name: target.toLowerCase(),
            type: 'belongsTo',
            target
          });
          continue;
        }

        const cleanName = cleanIdentifier(rawToken);
        if (cleanName && !entityData.fields.some(f => f.name.toLowerCase() === cleanName.toLowerCase())) {
          const { type, modifiers } = inferFieldType(cleanName);
          entityData.fields.push({
            name: cleanName,
            type,
            modifiers
          });
        }
      }
      continue;
    }

    // Standalone relations: "Post belongs to User"
    const relMatch = sentence.match(/([A-Za-z0-9_]+)\s+belong(?:s)?\s+to\s+([A-Za-z0-9_]+)/i);
    if (relMatch) {
      const source = capitalize(singularize(cleanIdentifier(relMatch[1].trim())));
      const target = capitalize(singularize(cleanIdentifier(relMatch[2].trim())));

      if (!entities.has(source)) {
        entities.set(source, { name: source, fields: [{ name: 'title', type: 'string', modifiers: 'required' }], relations: [] });
      }
      const sourceData = entities.get(source);
      if (!sourceData.relations.some(r => r.target === target && r.type === 'belongsTo')) {
        sourceData.relations.push({
          name: target.toLowerCase(),
          type: 'belongsTo',
          target
        });
      }
      if (!entities.has(target)) {
        entities.set(target, { name: target, fields: [{ name: 'name', type: 'string', modifiers: 'required' }], relations: [] });
      }
    }
  }

  // 3. If no entities could be extracted, infer from nouns in the prompt
  if (entities.size === 0) {
    // Extract keywords like "gym", "store", "tasks", etc.
    const words = text.split(/\s+/).map(w => cleanIdentifier(singularize(w))).filter(w => w.length > 3);
    const candidateEntity = words.find(w => !['make', 'create', 'generate', 'build', 'website', 'fresh', 'prompt', 'need', 'blody', 'with', 'from'].includes(w.toLowerCase()));

    const mainEntityName = candidateEntity ? capitalize(candidateEntity) : 'Item';
    entities.set(mainEntityName, {
      name: mainEntityName,
      fields: [
        { name: 'title', type: 'string', modifiers: 'required' },
        { name: 'description', type: 'text', modifiers: '' },
        { name: 'status', type: 'enum(active, pending, archived)', modifiers: 'default(active)' },
        { name: 'createdAtDate', type: 'date', modifiers: '' }
      ],
      relations: []
    });
  }

  const entityList = Array.from(entities.values());
  return buildDSLString(appName, authEnabled, entityList);
}

module.exports = {
  naturalTextToDSL,
  inferFieldType,
  DOMAIN_ARCHETYPES
};
