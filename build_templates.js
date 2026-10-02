#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pug = require('pug');

const REPO_ROOT = __dirname;
const TEMPLATES_DIR = path.join(REPO_ROOT, 'templates');

// Load data.js
const dataJsPath = path.join(REPO_ROOT, 'data.js');
let hackData = null;

if (fs.existsSync(dataJsPath)) {
  const content = fs.readFileSync(dataJsPath, 'utf8');
  // Extract JSON after "const HACK_DATA = "
  const match = content.match(/const\s+HACK_DATA\s*=\s*(\{[\s\S]*\});\s*$/);
  if (match) {
    try {
      hackData = JSON.parse(match[1]);
    } catch (e) {
      console.error('Error parsing HACK_DATA from data.js:', e);
    }
  }
}

if (!hackData) {
  console.warn('Could not load data.js, using default fallback metadata.');
  hackData = {
    system: { llmModel: 'Gemini 3.8 Flash (Medium)' },
    batches: [{ id: '2k25', name: '2k25' }, { id: '2k24', name: '2k24' }, { id: '2k23', name: '2k23' }],
    assignments: [
      {
        id: 'a1',
        code: 'A-01',
        title: 'Dual LED, Software PWM & Sonar',
        llmModel: 'Gemini 3.8 Flash (Medium)',
        question: ''
      }
    ]
  };
}

const batches = hackData.batches || [{ id: '2k25', name: '2k25' }];
const assignments = hackData.assignments || [];
const defaultModel = (hackData.system && hackData.system.llmModel) || 'Gemini 3.8 Flash (Medium)';

// Compile Index (Cumulative View)
const indexTemplate = path.join(TEMPLATES_DIR, 'index.pug');
const indexHtml = pug.renderFile(indexTemplate, {
  pretty: true,
  pageType: 'cumulative',
  assignmentId: null,
  pageTitle: 'HACK Technical Leaderboard | Hardware Acceleration Club of KUET',
  batches: batches,
  activeBatch: batches[0] ? batches[0].id : '2k25',
  assignments: assignments,
  activeModel: defaultModel
});

fs.writeFileSync(path.join(REPO_ROOT, 'index.html'), indexHtml, 'utf8');
console.log('✓ Compiled templates/index.pug -> index.html');

// Compile each Assignment page (e.g. a1.html)
const assignmentTemplate = path.join(TEMPLATES_DIR, 'assignment.pug');
assignments.forEach(a => {
  const assignHtml = pug.renderFile(assignmentTemplate, {
    pretty: true,
    pageType: 'assignment',
    assignmentId: a.id,
    assignmentCode: a.code,
    assignmentTitle: a.title,
    questionText: a.question || '',
    pageTitle: `${a.code}: ${a.title} | HACK KUET`,
    batches: batches,
    activeBatch: a.batch || '2k25',
    assignments: assignments,
    activeModel: a.llmModel || defaultModel
  });

  const outFileName = `${a.id}.html`;
  fs.writeFileSync(path.join(REPO_ROOT, outFileName), assignHtml, 'utf8');
  console.log(`✓ Compiled templates/assignment.pug -> ${outFileName}`);
});
