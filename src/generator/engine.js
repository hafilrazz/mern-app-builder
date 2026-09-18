/**
 * Template Rendering Engine
 * Powered by Handlebars with specialized helpers for code generation.
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Register custom helpers
Handlebars.registerHelper('lowercase', function (str) {
  return str ? String(str).toLowerCase() : '';
});

Handlebars.registerHelper('uppercase', function (str) {
  return str ? String(str).toUpperCase() : '';
});

Handlebars.registerHelper('slice', function (str, start, end) {
  if (!str) return '';
  return String(str).slice(start, end);
});

Handlebars.registerHelper('capitalize', function (str) {
  if (!str) return '';
  const s = String(str);
  return s.charAt(0).toUpperCase() + s.slice(1);
});

Handlebars.registerHelper('camelCase', function (str) {
  if (!str) return '';
  const s = String(str);
  return s.charAt(0).toLowerCase() + s.slice(1);
});

Handlebars.registerHelper('kebabCase', function (str) {
  if (!str) return '';
  return String(str)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
});

Handlebars.registerHelper('pluralize', function (str) {
  if (!str) return '';
  const s = String(str);
  if (s.endsWith('y') && !/[aeiou]y$/i.test(s)) {
    return s.slice(0, -1) + 'ies';
  }
  if (s.endsWith('s') || s.endsWith('x') || s.endsWith('z') || s.endsWith('ch') || s.endsWith('sh')) {
    return s + 'es';
  }
  return s + 's';
});

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

Handlebars.registerHelper('ne', function (a, b) {
  return a !== b;
});

Handlebars.registerHelper('or', function (a, b) {
  return Boolean(a || b);
});

Handlebars.registerHelper('and', function (a, b) {
  return Boolean(a && b);
});

Handlebars.registerHelper('not', function (val) {
  return !val;
});

Handlebars.registerHelper('json', function (context) {
  return JSON.stringify(context, null, 2);
});

Handlebars.registerHelper('mongooseType', function (type) {
  switch ((type || '').toLowerCase()) {
    case 'number':
      return 'Number';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'Date';
    default:
      return 'String';
  }
});

Handlebars.registerHelper('hasDefault', function (field) {
  if (!field) return false;
  return field.defaultValue !== null && field.defaultValue !== undefined && field.defaultValue !== '';
});

Handlebars.registerHelper('hasMin', function (field) {
  if (!field) return false;
  return field.min !== null && field.min !== undefined && field.min !== '' && !isNaN(Number(field.min));
});

Handlebars.registerHelper('hasMax', function (field) {
  if (!field) return false;
  return field.max !== null && field.max !== undefined && field.max !== '' && !isNaN(Number(field.max));
});

Handlebars.registerHelper('defaultFormatted', function (field) {
  if (!field || field.defaultValue === null || field.defaultValue === undefined || field.defaultValue === '') return '';
  if (field.type === 'boolean') {
    return field.defaultValue === 'true' || field.defaultValue === true ? 'true' : 'false';
  }
  if (field.type === 'number') {
    return Number(field.defaultValue);
  }
  return `'${field.defaultValue}'`;
});

/**
 * Compiles and renders a template string with given context.
 */
function renderTemplate(templateString, context) {
  const compiled = Handlebars.compile(templateString, { noEscape: true });
  return compiled(context);
}

/**
 * Reads a template file from disk and compiles it.
 */
function renderTemplateFile(filePath, context) {
  const content = fs.readFileSync(filePath, 'utf8');
  return renderTemplate(content, context);
}

module.exports = {
  Handlebars,
  renderTemplate,
  renderTemplateFile
};
