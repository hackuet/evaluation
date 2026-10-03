// HACK Elo Rating Board - CSV-Powered Automated Ranking Engine
// Hardware Acceleration Club of KUET

document.addEventListener('DOMContentLoaded', () => {
  let activeBatch = '2k25';
  let activeScope = 'all'; // Default to cumulative rating!
  let searchQuery = '';
  let statusFilter = 'all';

  const rootPath = (document.body && document.body.getAttribute('data-root-path')) || '';

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('batch')) {
    activeBatch = urlParams.get('batch');
  } else {
    const batchMatch = window.location.pathname.match(/\/(\d+k\d+)\//);
    if (batchMatch) {
      activeBatch = batchMatch[1];
    }
  }

  // Detect initial scope from body attributes or URL parameters
  const pageType = document.body ? document.body.getAttribute('data-page') : null;
  const pageAssignmentId = document.body ? document.body.getAttribute('data-assignment-id') : null;
  const pageClassId = document.body ? document.body.getAttribute('data-class-id') : null;
  if (pageType === 'assignment' && pageAssignmentId) {
    activeScope = pageAssignmentId;
  } else if (pageType === 'class' && pageClassId) {
    activeScope = pageClassId;
  } else {
    if (urlParams.get('scope')) {
      activeScope = urlParams.get('scope');
    } else if (urlParams.get('assignment')) {
      activeScope = urlParams.get('assignment');
    } else {
      const pathMatch = window.location.pathname.match(/([a-zA-Z0-9_-]+)\.html$/);
      if (pathMatch && pathMatch[1] !== 'index') {
        activeScope = pathMatch[1];
      }
    }
  }

  const assignmentSelect = document.getElementById('assignmentSelect');

  // Batch Buttons & Navigation Handling
  function updateBatchButtons() {
    const batchBtns = document.querySelectorAll('.batch-btn');
    batchBtns.forEach(btn => {
      const bId = btn.getAttribute('data-batch');
      if (bId === activeBatch) {
        btn.classList.add('active');
        btn.style.background = '#000000';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#000000';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'var(--bg)';
        btn.style.color = 'var(--fg)';
        btn.style.borderColor = 'var(--border)';
      }
    });
  }

  function updateAssignmentDropdown() {
    if (!assignmentSelect) return;
    const batchAssignments = (HACK_DATA.assignments || []).filter(a => !a.batch || a.batch === activeBatch);
    const batchClasses = (HACK_DATA.classes || []).filter(c => !c.batch || c.batch === activeBatch);
    
    // Clear and rebuild options
    assignmentSelect.innerHTML = '';
    
    const cumOpt = document.createElement('option');
    cumOpt.value = `${rootPath}index.html?batch=${encodeURIComponent(activeBatch)}`;
    cumOpt.setAttribute('data-scope', 'all');
    cumOpt.textContent = 'CUMULATIVE (ALL ROUNDS)';
    if (activeScope === 'all') cumOpt.selected = true;
    assignmentSelect.appendChild(cumOpt);

    batchAssignments.forEach(a => {
      const opt = document.createElement('option');
      const aBatch = a.batch || activeBatch;
      opt.value = `${rootPath}${aBatch}/${a.id}.html`;
      opt.setAttribute('data-scope', a.id);
      opt.setAttribute('data-batch', aBatch);
      const cleanTitle = (a.title || '').replace(/^Assignment\s*\d+:\s*/i, '');
      opt.textContent = `${a.code}: ${cleanTitle.toUpperCase()}`;
      if (activeScope === a.id) opt.selected = true;
      assignmentSelect.appendChild(opt);
    });

    batchClasses.forEach(c => {
      const opt = document.createElement('option');
      const cBatch = c.batch || activeBatch;
      opt.value = `${rootPath}${cBatch}/${c.id}.html`;
      opt.setAttribute('data-scope', c.id);
      opt.setAttribute('data-batch', cBatch);
      const cleanTitle = (c.title || '').replace(/^Technical Workshop\s*\d+:\s*/i, '');
      opt.textContent = `${c.code}: ${cleanTitle.toUpperCase()}`;
      if (activeScope === c.id) opt.selected = true;
      assignmentSelect.appendChild(opt);
    });
  }

  function attachBatchButtonListeners() {
    document.querySelectorAll('.batch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bId = e.currentTarget.getAttribute('data-batch');
        if (!bId) return;
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const isCumulative = (pageType === 'cumulative') || (currentPath === 'index.html' || currentPath === '');
        if (!isCumulative) {
          // If on a specific assignment page inside a batch folder, navigate to cumulative index.html for the selected batch
          window.location.href = `${rootPath}index.html?batch=${encodeURIComponent(bId)}`;
          return;
        }
        if (bId === activeBatch) return;
        activeBatch = bId;
        activeScope = 'all';
        const url = new URL(window.location);
        url.searchParams.set('batch', activeBatch);
        window.history.pushState({}, '', url);
        updateBatchButtons();
        updateAssignmentDropdown();
        render();
      });
    });
  }

  updateBatchButtons();
  attachBatchButtonListeners();
  updateAssignmentDropdown();

  const searchInput = document.getElementById('searchInput');
  const statusFilterSelect = document.getElementById('statusFilter');
  const ratingTable = document.getElementById('ratingTable');
  const ratingTableHead = ratingTable ? ratingTable.querySelector('thead') : null;
  const ratingTableBody = document.getElementById('ratingTableBody');
  const leaderboardSection = document.getElementById('leaderboardSection');
  const metricSubmissions = document.getElementById('metricSubmissions');
  const metricTopScore = document.getElementById('metricTopScore');
  const metricMean = document.getElementById('metricMean');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const printBtn = document.getElementById('printBtn');
  const rubricToggleBtn = document.getElementById('rubricToggleBtn') || document.getElementById('btnRubricModal');
  const rubricModal = document.getElementById('rubricModal');
  const rubricCloseBtn = document.getElementById('rubricCloseBtn');
  const rubricModalTitle = document.getElementById('rubricModalTitle');
  const rubricModalContent = document.getElementById('rubricModalContent');

  // Assignment Question Section
  const assignmentQuestionSection = document.getElementById('assignmentQuestionSection');
  const assignmentQuestionHeader = document.getElementById('assignmentQuestionHeader');
  const assignmentQuestionBody = document.getElementById('assignmentQuestionBody');

  // Profile Modal Elements (Cumulative View)
  const profileModal = document.getElementById('profileModal');
  const profileModalCloseBtn = document.getElementById('profileModalCloseBtn');
  const profileModalTitle = document.getElementById('profileModalTitle');
  const profileModalBody = document.getElementById('profileModalBody');

  // Class Details Modal Elements
  const classDetailModal = document.getElementById('classDetailModal');
  const classModalCloseBtn = document.getElementById('classModalCloseBtn');
  const classModalBackBtn = document.getElementById('classModalBackBtn');
  const classModalTitle = document.getElementById('classModalTitle');
  const classModalBody = document.getElementById('classModalBody');
  const btnClassCurriculumModal = document.getElementById('btnClassCurriculumModal');

  // Detail Modal Elements (Assignment Audit View)
  const detailModal = document.getElementById('detailModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalBackBtn = document.getElementById('modalBackBtn');
  const modalTitle = document.getElementById('modalTitle');
  const modalInstructorCallout = document.getElementById('modalInstructorCallout');
  const modalInstructorNoteText = document.getElementById('modalInstructorNoteText');
  const modalScoreTableBody = document.getElementById('modalScoreTableBody');
  const modalFileTabs = document.getElementById('modalFileTabs');
  const modalCodeDisplay = document.getElementById('modalCodeDisplay');
  const modalCritiqueDisplay = document.getElementById('modalCritiqueDisplay');
  const modalStudentCommentText = document.getElementById('modalStudentCommentText');
  const modalDriveLinkAnchor = document.getElementById('modalDriveLinkAnchor');
  const modalDriveWarning = document.getElementById('modalDriveWarning');

  // Security & Prompt Injection Defense: HTML escaping for all untrusted student data
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Clean LaTeX math to readable plain text
  function cleanMathText(expr) {
    if (!expr) return '';
    return expr
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\mu/g, 'µ')
      .replace(/\\,/g, ' ')
      .replace(/\\;/g, ' ')
      .replace(/\\quad/g, '  ')
      .replace(/\\dots/g, '...')
      .replace(/\\([a-zA-Z]+)/g, '$1')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Render LaTeX formula using KaTeX if available or clean HTML fallback
  function renderFormulaHtml(raw, isBlock) {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    if (typeof window !== 'undefined' && typeof window.katex !== 'undefined') {
      try {
        return isBlock
          ? `<div class="math-block" style="margin: 12px 0; overflow-x: auto; padding: 4px 0;">${window.katex.renderToString(trimmed, { displayMode: true, throwOnError: false })}</div>`
          : window.katex.renderToString(trimmed, { displayMode: false, throwOnError: false });
      } catch (e) {
        // Fallback
      }
    }
    const clean = cleanMathText(trimmed);
    if (isBlock) {
      return `<div class="formula-box" style="background: var(--bg-alt); border: 1px solid var(--border); border-left: 3px solid #000000; padding: 8px 14px; margin: 12px 0; font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: #000000; overflow-x: auto;">${escapeHtml(clean)}</div>`;
    }
    return `<code class="math-inline" style="background: #f0f0f0; padding: 2px 5px; font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: #000000; border: 1px solid var(--border-light);">${escapeHtml(clean)}</code>`;
  }

  // Safe markdown renderer for evaluation reports
  function renderMarkdownSafe(md) {
    if (!md) return '';
    const codeBlocks = [];
    let text = md.replace(/```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const token = `%%CODE_BLOCK_${codeBlocks.length}%%`;
      codeBlocks.push(`<pre class="code-box" style="margin: 10px 0; overflow-x: auto; background: #f0f0f0 !important; color: #000000 !important; padding: 12px; border: 1px solid var(--border); font-family: var(--font-mono); font-size: 11px;"><code style="color: #000000 !important; background: transparent !important;">${escapeHtml(code)}</code></pre>`);
      return token;
    });

    // Parse block math ($$...$$)
    const mathBlocks = [];
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      const token = `%%MATH_BLOCK_${mathBlocks.length}%%`;
      mathBlocks.push(renderFormulaHtml(formula, true));
      return token;
    });

    // Parse inline math ($...$)
    const inlineMath = [];
    text = text.replace(/\$([^\$\n\r]+?)\$/g, (match, formula) => {
      const token = `%%INLINE_MATH_${inlineMath.length}%%`;
      inlineMath.push(renderFormulaHtml(formula, false));
      return token;
    });

    function formatInlineMarkdown(str) {
      if (!str) return '';
      let val = escapeHtml(str);
      // Links: [text](url)
      val = val.replace(/\[(.*?)\]\(((?:file|https?):\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--fg); text-decoration: underline;">$1</a>');
      // Bold: **text**
      val = val.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic: *text*
      val = val.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Inline code: `code`
      val = val.replace(/`([^`]+)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; font-family: var(--font-mono); font-size: 11px; border: 1px solid var(--border-light); color: #000000;">$1</code>');
      return val;
    }

    // Parse markdown tables before HTML escaping
    const tables = [];
    text = text.replace(/((?:^[ \t]*\|[^\n]+\|\r?\n)+)/gm, (match) => {
      const rows = match.trim().split('\n').filter(r => !r.includes('---'));
      if (rows.length === 0) return match;
      const token = `%%TABLE_BLOCK_${tables.length}%%`;
      let tblHtml = '<div class="table-wrap" style="margin: 12px 0;"><table class="audit-md-table" style="width: 100%; min-width: 680px; border-collapse: collapse; font-size: 11px; border: 1px solid var(--border-light);">';
      rows.forEach((r, idx) => {
        const cells = r.split('|').slice(1, -1).map(c => c.trim());
        tblHtml += '<tr>';
        cells.forEach(c => {
          const tag = idx === 0 ? 'th' : 'td';
          const bg = idx === 0 ? 'background: #f0f0f0; font-weight: bold;' : '';
          tblHtml += `<${tag} style="border: 1px solid #cccccc; padding: 6px 10px; ${bg}">${formatInlineMarkdown(c)}</${tag}>`;
        });
        tblHtml += '</tr>';
      });
      tblHtml += '</table></div>';
      tables.push(tblHtml);
      return token;
    });

    text = escapeHtml(text);

    // Markdown Links
    text = text.replace(/\[(.*?)\]\(((?:file|https?):\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--fg); text-decoration: underline;">$1</a>');

    // Headers
    text = text.replace(/^#### (.*?)$/gm, '<h5 style="margin-top: 14px; margin-bottom: 6px; font-size: 12px; font-weight: bold; color: var(--fg);">$1</h5>');
    text = text.replace(/^### (.*?)$/gm, '<h4 style="margin-top: 16px; margin-bottom: 8px; font-size: 13px; font-weight: bold; color: var(--fg);">$1</h4>');
    text = text.replace(/^## (.*?)$/gm, '<h3 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: bold; color: var(--fg); border-bottom: 1px solid var(--border-light); padding-bottom: 4px;">$1</h3>');
    text = text.replace(/^# (.*?)$/gm, '<h2 style="margin-top: 22px; margin-bottom: 12px; font-size: 16px; font-weight: bold; color: var(--fg); border-bottom: 2px solid var(--border); padding-bottom: 6px;">$1</h2>');

    // Bold, italic, code spans
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; font-family: var(--font-mono); font-size: 11px; border: 1px solid var(--border-light); color: #000000;">$1</code>');

    // Horizontal rule
    text = text.replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid var(--border-light); margin: 16px 0;">');

    // Paragraphs
    text = text.replace(/\n\n+/g, '</p><p style="margin-bottom: 10px;">');
    text = `<p style="margin-bottom: 10px;">${text}</p>`;

    // Restore tables
    tables.forEach((tbl, i) => {
      text = text.replace(`%%TABLE_BLOCK_${i}%%`, tbl);
    });

    // Restore math blocks & inline math
    mathBlocks.forEach((mb, i) => {
      text = text.replace(`%%MATH_BLOCK_${i}%%`, mb);
    });
    inlineMath.forEach((im, i) => {
      text = text.replace(`%%INLINE_MATH_${i}%%`, im);
    });

    // Restore code blocks
    codeBlocks.forEach((cb, i) => {
      text = text.replace(`%%CODE_BLOCK_${i}%%`, cb);
    });

    return text;
  }

  // RFC-4180 compliant CSV Parser
  function parseCSV(text) {
    const lines = [];
    let row = [];
    let inQuotes = false;
    let cur = '';
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push(cur.trim());
        cur = '';
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        row.push(cur.trim());
        if (row.some(cell => cell.length > 0)) lines.push(row);
        row = [];
        cur = '';
      } else {
        cur += c;
      }
    }
    if (cur.length > 0 || row.length > 0) {
      row.push(cur.trim());
      if (row.some(cell => cell.length > 0)) lines.push(row);
    }
    return lines;
  }

  // Attempt to load CSV from 2k25/assignment-1/assignment-1.csv dynamically
  async function loadCSVData() {
    try {
      const res = await fetch(`2k25/assignment-1/assignment-1.csv?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) return;
      const text = await res.text();
      const rows = parseCSV(text);
      if (rows.length < 2) return;

      const headers = rows[0].map(h => h.toLowerCase());
      const getVal = (r, key) => {
        const idx = headers.indexOf(key.toLowerCase());
        return idx !== -1 ? r[idx] : '';
      };

      // Ingest CSV records and merge/update students
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const roll = getVal(r, 'roll');
        if (!roll) continue;
        const batch = getVal(r, 'batch') || '2k25';
        const status = getVal(r, 'status') || 'Evaluated';
        const subTime = getVal(r, 'submission_time');
        const driveLink = getVal(r, 'drive_link');
        const instNote = getVal(r, 'instructor_note');
        const stdComment = getVal(r, 'student_comment');

        const part = parseFloat(getVal(r, 'participation')) || 55;
        const inTime = parseFloat(getVal(r, 'in_time')) || 15;
        const t1Inst = parseFloat(getVal(r, 'task1_inst')) || 0;
        const t1Llm = parseFloat(getVal(r, 'task1_llm')) || 0;
        const t2Inst = parseFloat(getVal(r, 'task2_inst')) || 0;
        const t2Llm = parseFloat(getVal(r, 'task2_llm')) || 0;
        const t3Inst = parseFloat(getVal(r, 'task3_inst')) || 0;
        const t3Llm = parseFloat(getVal(r, 'task3_llm')) || 0;
        const docInst = parseFloat(getVal(r, 'docs_inst')) || 0;
        const docLlm = parseFloat(getVal(r, 'docs_llm')) || 0;
        const bInst = parseFloat(getVal(r, 'bonus_inst')) || 0;
        const bLlm = parseFloat(getVal(r, 'bonus_llm')) || 0;

        let student = HACK_DATA.students.find(s => s.id === roll || s.roll === roll);
        if (!student) {
          student = {
            id: roll,
            roll: roll,
            batch: batch,
            assignments: []
          };
          HACK_DATA.students.push(student);
        }

        // Update assignment 1 submission in student's assignments array
        let a1Sub = student.assignments.find(a => a.assignmentId === 'a1');
        if (!a1Sub) {
          a1Sub = { assignmentId: 'a1', codeFiles: [] };
          student.assignments.push(a1Sub);
        }

        a1Sub.status = status;
        a1Sub.submissionTime = subTime;
        a1Sub.driveLink = driveLink;
        a1Sub.instructorTransparencyNote = instNote;
        a1Sub.studentComment = stdComment;
        const existingScores = a1Sub.scores || {};
        a1Sub.scores = {
          ...existingScores,
          participation: {
            max: 55,
            inst: part,
            llm: part,
            note: (existingScores.participation && existingScores.participation.note) || 'Participation credit',
            llmReasoning: (existingScores.participation && existingScores.participation.llmReasoning) || 'Full credit for submitted attempt.'
          },
          inTime: {
            max: 15,
            inst: inTime,
            llm: inTime,
            note: (existingScores.inTime && existingScores.inTime.note) || 'Submission timing',
            llmReasoning: (existingScores.inTime && existingScores.inTime.llmReasoning) || 'Submitted on time.'
          },
          task1: {
            max: 25,
            inst: t1Inst,
            llm: t1Llm,
            note: (existingScores.task1 && existingScores.task1.note) || `Inst: ${t1Inst}, LLM: ${t1Llm}`,
            llmReasoning: (existingScores.task1 && existingScores.task1.llmReasoning) || `Task 1 technical evaluation.`
          },
          task2: {
            max: 25,
            inst: t2Inst,
            llm: t2Llm,
            note: (existingScores.task2 && existingScores.task2.note) || `Inst: ${t2Inst}, LLM: ${t2Llm}`,
            llmReasoning: (existingScores.task2 && existingScores.task2.llmReasoning) || `Task 2 technical evaluation.`
          },
          task3: {
            max: 25,
            inst: t3Inst,
            llm: t3Llm,
            note: (existingScores.task3 && existingScores.task3.note) || `Inst: ${t3Inst}, LLM: ${t3Llm}`,
            llmReasoning: (existingScores.task3 && existingScores.task3.llmReasoning) || `Task 3 technical evaluation.`
          },
          documentation: {
            max: 5,
            inst: docInst,
            llm: docLlm,
            note: (existingScores.documentation && existingScores.documentation.note) || `Inst: ${docInst}, LLM: ${docLlm}`,
            llmReasoning: (existingScores.documentation && existingScores.documentation.llmReasoning) || `Inline comments evaluation.`
          },
          bonus: {
            max: 75,
            inst: bInst,
            llm: bLlm,
            note: (existingScores.bonus && existingScores.bonus.note) || `Inst: ${bInst}, LLM: ${bLlm}`,
            llmReasoning: (existingScores.bonus && existingScores.bonus.llmReasoning) || `Bonus pool evaluation.`
          }
        };
      }
    } catch (e) {
      // Direct file:// access without HTTP server fallback to built-in HACK_DATA
      console.log('Using pre-bundled dataset (HTTP fetch bypassed)');
    }
  }

  // Calculate score items using hybrid 60/40 rule
  function getComputedItem(item, isTaskOrBonus = true) {
    if (!item) return { max: 0, inst: 0, llm: 0, final: 0, note: '-', llmReasoning: '-' };
    let finalVal;
    if (isTaskOrBonus) {
      finalVal = (item.inst * 0.6) + (item.llm * 0.4);
    } else {
      finalVal = item.inst;
    }
    finalVal = Math.round(finalVal * 100) / 100;
    return {
      max: item.max,
      inst: item.inst,
      llm: item.llm,
      final: finalVal,
      note: item.note,
      llmReasoning: item.llmReasoning || item.note || '-'
    };
  }

  // Evaluate an assignment submission
  function evaluateSubmission(submission) {
    if (!submission) return null;
    const sc = submission.scores || {};
    const computedScores = {};
    let total = 0;

    const nonTaskKeys = ['participation', 'inTime', 'documentation'];
    const hasIndividualBonuses = Object.keys(sc).some(k => k.startsWith('bonus_'));

    Object.keys(sc).forEach(key => {
      // If individual bonuses exist, don't double count the pooled 'bonus' key
      if (hasIndividualBonuses && key === 'bonus') return;
      const isTaskOrBonus = !nonTaskKeys.includes(key);
      const computed = getComputedItem(sc[key], isTaskOrBonus);
      computedScores[key] = computed;
      total += computed.final;
    });

    // Provide computedScores.bonus for unified summary/breakdown
    if (!computedScores.bonus) {
      if (hasIndividualBonuses) {
        let bInst = 0, bLlm = 0, bFinal = 0, bMax = 0;
        Object.keys(computedScores).forEach(k => {
          if (k.startsWith('bonus_')) {
            bInst += computedScores[k].inst;
            bLlm += computedScores[k].llm;
            bFinal += computedScores[k].final;
            bMax += computedScores[k].max;
          }
        });
        computedScores.bonus = {
          max: bMax || 75,
          inst: Math.round(bInst * 100) / 100,
          llm: Math.round(bLlm * 100) / 100,
          final: Math.round(bFinal * 100) / 100,
          note: 'Sum of individual bonus tasks',
          llmReasoning: 'Sum of individual bonus evaluations.'
        };
      } else {
        computedScores.bonus = getComputedItem(sc.bonus, true);
      }
    }

    total = Math.round(total * 100) / 100;
    const percentage = ((total / 150) * 100).toFixed(1) + '%';

    return {
      ...submission,
      computedScores,
      computedTotal: total,
      computedPercentage: percentage
    };
  }

  // Helper: Compute full cumulative model across all assignments and workshops for a student
  function getStudentCumulativeModel(student) {
    if (!student) return { cumulativeScore: 0, evaluatedCount: 0, assignmentSummaries: [], classSummaries: [] };
    const assignments = Array.isArray(student.assignments) ? student.assignments : [];
    const classes = Array.isArray(student.classes) ? student.classes : [];

    let cumTotal = 0;
    let evaluatedCount = 0;
    let lastStatus = 'Evaluated';
    const assignmentSummaries = [];
    const classSummaries = [];

    assignments.forEach(a => {
      const ev = evaluateSubmission(a);
      if (ev) {
        cumTotal += ev.computedTotal;
        evaluatedCount++;
        if (ev.status === 'Pending Drive Access') lastStatus = ev.status;
        const meta = (HACK_DATA.assignments || []).find(metaA => metaA.id === a.assignmentId) || {};
        assignmentSummaries.push({
          id: a.assignmentId,
          code: meta.code || a.assignmentId.toUpperCase(),
          title: meta.title || 'Assignment',
          baseMax: meta.baseMax || 150,
          score: ev.computedTotal,
          percentage: ev.computedPercentage,
          status: ev.status,
          submissionTime: ev.submissionTime
        });
      }
    });

    classes.forEach(c => {
      cumTotal += (c.totalPts || 0);
      classSummaries.push({
        id: c.classId,
        code: c.code || 'C-01',
        title: c.title || 'Technical Workshop',
        status: c.status || 'Present',
        score: c.totalPts || 50.0,
        date: c.date,
        venue: c.venue
      });
    });

    return {
      isCumulative: true,
      cumulativeScore: Math.round(cumTotal * 100) / 100,
      evaluatedCount: evaluatedCount,
      assignmentSummaries: assignmentSummaries,
      classSummaries: classSummaries,
      classesCount: classes.length,
      status: assignments.length > 0 ? lastStatus : (classes.length > 0 ? 'Present' : 'Enrolled'),
      primarySubmission: assignments.length > 0 ? evaluateSubmission(assignments[0]) : null
    };
  }

  // Get student's score model for active scope
  function getStudentScoreModel(student) {
    if (!student) return null;
    const assignments = Array.isArray(student.assignments) ? student.assignments : [];
    const classes = Array.isArray(student.classes) ? student.classes : [];

    const isClassScope = (HACK_DATA.classes || []).some(c => c.id === activeScope) || activeScope.startsWith('c');

    if (activeScope === 'all') {
      return getStudentCumulativeModel(student);
    } else if (isClassScope) {
      // Single Class Scope View
      const foundClass = classes.find(c => c.classId === activeScope);
      const classMeta = (HACK_DATA.classes || []).find(c => c.id === activeScope) || {};
      if (foundClass) {
        return {
          isCumulative: false,
          isClass: true,
          assignmentData: {
            computedTotal: foundClass.totalPts,
            status: foundClass.status,
            remarks: foundClass.remarks,
            classRec: foundClass,
            computedScores: {
              participation: { final: foundClass.attendancePts },
              quiz: { final: foundClass.quizPts },
              bonus: { final: foundClass.bonusPts }
            }
          },
          status: foundClass.status
        };
      } else {
        return {
          isCumulative: false,
          isClass: true,
          assignmentData: {
            computedTotal: 0,
            status: 'Absent',
            remarks: 'Not recorded in attendance',
            classRec: null,
            computedScores: {
              participation: { final: 0 },
              quiz: { final: 0 },
              bonus: { final: 0 }
            }
          },
          status: 'Absent'
        };
      }
    } else {
      // Single Assignment View: Look up selected assignment
      const found = assignments.find(a => a.assignmentId === activeScope);
      const ev = evaluateSubmission(found || assignments[0]);
      return {
        isCumulative: false,
        isClass: false,
        assignmentData: ev,
        status: ev ? ev.status : 'Unknown'
      };
    }
  }

  // Main Render Function
  function render() {
    leaderboardSection.style.display = 'block';

    // 1. Process and map students with calculated scores
    let list = HACK_DATA.students
      .filter(s => s.batch === activeBatch)
      .map(s => ({
        ...s,
        scoreModel: getStudentScoreModel(s)
      }));

    // 2. Filter by search query
    if (searchQuery) {
      list = list.filter(s => 
        s.roll.toLowerCase().includes(searchQuery)
      );
    }

    // 3. Filter by status
    if (statusFilter !== 'all') {
      list = list.filter(s => s.scoreModel && s.scoreModel.status === statusFilter);
    }

    // 4. AUTOMATIC RANK CALCULATION:
    // Sort descending by score
    list.sort((a, b) => {
      const scoreA = a.scoreModel.isCumulative ? a.scoreModel.cumulativeScore : a.scoreModel.assignmentData.computedTotal;
      const scoreB = b.scoreModel.isCumulative ? b.scoreModel.cumulativeScore : b.scoreModel.assignmentData.computedTotal;
      return scoreB - scoreA;
    });

    list.forEach((s, idx) => {
      s.computedRank = idx + 1;
    });

    // 5. Update Metrics Strip
    if (metricSubmissions) metricSubmissions.textContent = list.length;
    if (list.length > 0 && metricTopScore && metricMean) {
      const topScore = list[0].scoreModel.isCumulative ? list[0].scoreModel.cumulativeScore : list[0].scoreModel.assignmentData.computedTotal;
      const sum = list.reduce((acc, s) => acc + (s.scoreModel.isCumulative ? s.scoreModel.cumulativeScore : s.scoreModel.assignmentData.computedTotal), 0);
      const mean = (sum / list.length).toFixed(2);
      metricTopScore.innerHTML = `${topScore.toFixed(2)} <span style="font-size: 11px; font-weight: normal;">/ 150</span>`;
      metricMean.innerHTML = `${mean} <span style="font-size: 11px; font-weight: normal;">/ 150</span>`;
    } else if (metricTopScore && metricMean) {
      metricTopScore.innerHTML = `- <span style="font-size: 11px; font-weight: normal;">/ 150</span>`;
      metricMean.innerHTML = `- <span style="font-size: 11px; font-weight: normal;">/ 150</span>`;
    }

    // 6. Update Table Header, Question Block & Rubric Button based on Scope
    const isClassScope = (HACK_DATA.classes || []).some(c => c.id === activeScope) || activeScope.startsWith("c");

    if (activeScope === "all") {
      // Cumulative Rating View: Rubric and question are assignment-specific, so hide them
      if (rubricToggleBtn) rubricToggleBtn.style.display = "none";
      if (statusFilterSelect) statusFilterSelect.style.display = "none";
      if (assignmentQuestionSection) assignmentQuestionSection.style.display = "none";

      if (ratingTableHead) {
        ratingTableHead.innerHTML = `
          <tr>
            <th style="width: 50px;">Rank</th>
            <th style="width: 140px;">Roll</th>
            <th style="width: 140px; text-align: right;">Total Points</th>
            <th>Completed Activities</th>
            <th style="width: 110px; text-align: center;">Profile</th>
          </tr>
        `;
      }
    } else if (isClassScope) {
      // Class Workshop View
      if (rubricToggleBtn) rubricToggleBtn.style.display = "none";
      if (statusFilterSelect) statusFilterSelect.style.display = "none";
      if (assignmentQuestionSection) assignmentQuestionSection.style.display = "none";

      if (ratingTableHead) {
        ratingTableHead.innerHTML = `
          <tr>
            <th style="width: 50px;">Rank</th>
            <th style="width: 140px;">Roll</th>
            <th style="width: 130px; text-align: right;">Participation Pts</th>
            <th>Attendance Status & Session Remarks</th>
            <th style="width: 110px; text-align: center;">Profile</th>
          </tr>
        `;
      }
    } else {
      // Assignment-specific View: Show rubric button and question block
      const assignMeta = HACK_DATA.assignments.find(a => a.id === activeScope) || { code: activeScope.toUpperCase(), title: "Assignment" };
      if (rubricToggleBtn) {
        rubricToggleBtn.style.display = "inline-flex";
        rubricToggleBtn.textContent = `[View ${assignMeta.code} Rubric]`;
      }
      if (statusFilterSelect) statusFilterSelect.style.display = "inline-block";

      if (assignmentQuestionSection && assignmentQuestionBody && assignMeta.question) {
        assignmentQuestionSection.style.display = "block";
        const qTitleEl = document.getElementById("assignmentQuestionTitle") || assignmentQuestionHeader;
        const cleanTitle = (assignMeta.title || "").replace(/^Assignment\s*\d+:\s*/i, "");
        if (qTitleEl) qTitleEl.textContent = `[${assignMeta.code}] ${cleanTitle} (Problem Statement)`;
        
        let formatted = escapeHtml(assignMeta.question);
        formatted = formatted.replace(/\[(https?:\/\/[^\s\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--fg); text-decoration: underline;">$1</a>');
        formatted = formatted.replace(/(^|[^">])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--fg); text-decoration: underline;">$2</a>');
        assignmentQuestionBody.innerHTML = formatted;
      } else if (assignmentQuestionSection) {
        assignmentQuestionSection.style.display = "none";
      }

      if (ratingTableHead) {
        ratingTableHead.innerHTML = `
          <tr>
            <th style="width: 50px;">Rank</th>
            <th style="width: 140px;">Roll</th>
            <th style="width: 120px; text-align: right;">Total Score</th>
            <th>Task Breakdown & Transparency Notes</th>
            <th style="width: 110px; text-align: center;">Audit</th>
          </tr>
        `;
      }
    }

    if (list.length === 0) {
      ratingTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: var(--fg-muted);">
            No records found matching current query.
          </td>
        </tr>
      `;
      return;
    }

    // Precompute per-assignment rank map across all students in activeBatch
    const assignmentRankMap = {};
    HACK_DATA.assignments.forEach(assign => {
      const arr = [];
      HACK_DATA.students
        .filter(s => s.batch === activeBatch)
        .forEach(s => {
          const sub = s.assignments && s.assignments.find(a => a.assignmentId === assign.id);
          if (sub) {
            const ev = evaluateSubmission(sub);
            if (ev) arr.push({ studentId: s.id, score: ev.computedTotal });
          }
        });
      arr.sort((a, b) => b.score - a.score);
      const rMap = {};
      arr.forEach((item, idx) => {
        rMap[item.studentId] = idx + 1;
      });
      assignmentRankMap[assign.id] = rMap;
    });

    // 7. Render Table Rows
    if (activeScope === "all") {
      // Render Cumulative Table Rows
      ratingTableBody.innerHTML = list.map(student => {
        const sm = student.scoreModel;
        return `
          <tr>
            <td class="rank-col">#${student.computedRank}</td>
            <td class="student-col">
              <strong>${student.roll}</strong>
            </td>
            <td class="score-col">
              <div style="font-size: 16px; font-weight: bold;">${sm.cumulativeScore.toFixed(2)}</div>
              <div style="font-size: 10px; color: var(--fg-muted);">Total Points</div>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                ${sm.assignmentSummaries.map(as => {
                  return `
                    <button class="btn btn-sm switch-scope-btn" data-assign="${as.id}" style="font-weight: 700;" title="Inspect ${as.code} (Score: ${as.score.toFixed(2)}/${as.baseMax})">
                      ${as.code.replace("A-0", "A")} [${as.score.toFixed(2)} pts]
                    </button>
                  `;
                }).join("")}
                ${sm.classSummaries.map(cs => {
                  return `
                    <button class="btn btn-sm switch-class-btn" data-class="${cs.id}" style="font-weight: 700; background: var(--bg-alt);" title="${cs.title} (Award: ${cs.score.toFixed(2)} pts)">
                      ${cs.code.replace("C-0", "C")} [${cs.score.toFixed(0)} pts]
                    </button>
                  `;
                }).join("")}
                ${sm.assignmentSummaries.length === 0 && sm.classSummaries.length === 0 ? '<span style="color: var(--fg-muted); font-size: 11px;">Enrolled</span>' : ""}
              </div>
            </td>
            <td style="text-align: center;">
              <button class="btn btn-sm view-profile-btn" data-id="${student.id}">[VIEW]</button>
            </td>
          </tr>
        `;
      }).join("");
    } else if (isClassScope) {
      // Render Class Attendance Table Rows
      ratingTableBody.innerHTML = list.map(student => {
        const ev = student.scoreModel.assignmentData;
        return `
          <tr>
            <td class="rank-col">#${student.computedRank}</td>
            <td class="student-col">
              <strong>${student.roll}</strong>
              <div style="font-size: 10px; color: var(--fg-dim); margin-top: 2px;">Status: ${ev.status}</div>
            </td>
            <td class="score-col">
              <div style="font-size: 15px; font-weight: bold;">${ev.computedTotal.toFixed(2)}</div>
              <div style="font-size: 10px; color: var(--fg-muted);">pts (50 base)</div>
            </td>
            <td>
              <div class="breakdown-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="tag-plain" style="font-weight: 700;">STATUS: ${ev.status.toUpperCase()}</span>
                <span class="tag-plain">ATTENDANCE: ${ev.classRec ? ev.classRec.attendancePts.toFixed(2) : "0.00"}/50</span>
                ${ev.remarks ? `<span style="font-size: 11px; color: var(--fg-muted);">&ldquo;${escapeHtml(ev.remarks)}&rdquo;</span>` : ""}
              </div>
            </td>
            <td style="text-align: center;">
              <button class="btn btn-sm view-profile-btn" data-id="${student.id}">[VIEW]</button>
            </td>
          </tr>
        `;
      }).join("");
    } else {
      // Render Assignment Details Table Rows with Collapsible Transparency
      ratingTableBody.innerHTML = list.map(student => {
        const ev = student.scoreModel.assignmentData;
        const sc = ev.computedScores;

        return `
          <tr>
            <td class="rank-col">#${student.computedRank}</td>
            <td class="student-col">
              <strong>${student.roll}</strong>
              <div style="font-size: 10px; color: var(--fg-dim); margin-top: 2px;">Status: ${ev.status}</div>
            </td>
            <td class="score-col">
              <div style="font-size: 15px; font-weight: bold;">${ev.computedTotal.toFixed(2)}</div>
              <div style="font-size: 10px; color: var(--fg-muted);">${ev.computedPercentage} (150 base)</div>
            </td>
            <td>
              <div class="breakdown-row">
                <span class="tag-plain">PART: ${sc.participation.final}/55</span>
                <span class="tag-plain">TIME: ${sc.inTime.final}/15</span>
                <span class="tag-plain">T1: ${sc.task1.final}/25</span>
                <span class="tag-plain">T2: ${sc.task2.final}/25</span>
                <span class="tag-plain">T3: ${sc.task3.final}/25</span>
                <span class="tag-plain">DOC: ${sc.documentation.final}/5</span>
                <span class="tag-plain">BONUS: ${sc.bonus.final}/75</span>
              </div>

              <!-- Collapsible Transparency Notes -->
              <details class="transparency-block">
                <summary>Instructor Transparency Notes (Why I Marked How)</summary>
                <div class="transparency-body">
                  <span class="inst-note">&ldquo;${ev.instructorTransparencyNote}&rdquo;</span>
                  <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px;">
                    <tr style="border-bottom: 1px solid #ddd; background: #eaeaea; font-weight: bold;">
                      <td style="padding: 2px 4px;">Task</td>
                      <td style="padding: 2px 4px;">Max</td>
                      <td style="padding: 2px 4px;">Inst (60%)</td>
                      <td style="padding: 2px 4px;">LLM (40%)</td>
                      <td style="padding: 2px 4px;">Final</td>
                    </tr>
                    <tr>
                      <td style="padding: 2px 4px;">Task 1</td>
                      <td style="padding: 2px 4px;">25</td>
                      <td style="padding: 2px 4px;">${sc.task1.inst}</td>
                      <td style="padding: 2px 4px;">${sc.task1.llm}</td>
                      <td style="padding: 2px 4px;"><strong>${sc.task1.final}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 2px 4px;">Task 2</td>
                      <td style="padding: 2px 4px;">25</td>
                      <td style="padding: 2px 4px;">${sc.task2.inst}</td>
                      <td style="padding: 2px 4px;">${sc.task2.llm}</td>
                      <td style="padding: 2px 4px;"><strong>${sc.task2.final}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 2px 4px;">Task 3</td>
                      <td style="padding: 2px 4px;">25</td>
                      <td style="padding: 2px 4px;">${sc.task3.inst}</td>
                      <td style="padding: 2px 4px;">${sc.task3.llm}</td>
                      <td style="padding: 2px 4px;"><strong>${sc.task3.final}</strong></td>
                    </tr>
                  </table>
                </div>
              </details>
            </td>
            <td style="text-align: center;">
              <button class="btn btn-sm audit-btn" data-id="${student.id}">[Audit Code]</button>
            </td>
          </tr>
        `;
      }).join("");
    }

    // Attach click listeners to profile buttons (in Cumulative & Class Mode)
    document.querySelectorAll(".view-profile-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        openStudentProfileModal(id);
      });
    });

    // Attach click listeners to audit buttons (in Assignment Mode)
    document.querySelectorAll(".audit-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        openAssignmentAuditModal(id, activeScope, false);
      });
    });

    // Quick switch to assignment scope when clicking [A1 #1]
    document.querySelectorAll(".switch-scope-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const assignId = e.currentTarget.getAttribute("data-assign");
        const assignMeta = HACK_DATA.assignments.find(a => a.id === assignId);
        const aBatch = (assignMeta && assignMeta.batch) || activeBatch;
        window.location.href = `${rootPath}${aBatch}/${assignId}.html`;
      });
    });

    // Quick switch to class scope when clicking [C1 50 pts]
    document.querySelectorAll(".switch-class-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const classId = e.currentTarget.getAttribute("data-class");
        const classMeta = (HACK_DATA.classes || []).find(c => c.id === classId);
        const cBatch = (classMeta && classMeta.batch) || activeBatch;
        window.location.href = `${rootPath}${cBatch}/${classId}.html`;
      });
    });
  }

  // Open Cumulative Student Profile Modal (With Activity Filter Tabs)
  function openStudentProfileModal(studentId) {
    const student = HACK_DATA.students.find(s => s.id === studentId);
    if (!student) return;

    const sm = getStudentCumulativeModel(student);
    const batchAssignments = (HACK_DATA.assignments || []).filter(a => a.batch === student.batch);
    const batchClasses = (HACK_DATA.classes || []).filter(c => c.batch === student.batch);
    const studentClasses = student.classes || [];

    profileModalTitle.textContent = `Student Profile: Roll ${student.roll}`;

    profileModalBody.innerHTML = `
      <div class="callout" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="min-width: 0; word-break: break-word;">
          <div style="font-size: 14px; font-weight: bold;">Roll: ${student.roll}</div>
          <div style="color: var(--fg-muted); font-size: 11px; margin-top: 2px;">
            Batch: ${student.batch}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; text-transform: uppercase; color: var(--fg-muted);">Total Rating Points</div>
          <div style="font-size: 20px; font-weight: 700;">
            ${sm.cumulativeScore.toFixed(2)} <span style="font-size: 11px; font-weight: normal; color: var(--fg-muted);">pts (Rank #${student.computedRank || 1})</span>
          </div>
        </div>
      </div>

      <!-- Activity Filter Tabs -->
      <div class="profile-filter-tabs">
        <button class="profile-filter-btn active" data-filter="all">All Activities (${batchAssignments.length + batchClasses.length})</button>
        <button class="profile-filter-btn" data-filter="assignments">Assignments (${batchAssignments.length})</button>
        <button class="profile-filter-btn" data-filter="classes">Classes & Workshops (${batchClasses.length})</button>
      </div>

      <!-- Assignments Section -->
      <div id="profileAssignmentsSection" style="margin-bottom: 20px;">
        <div style="margin: 8px 0;">
          <h4 style="text-transform: uppercase; font-size: 12px; font-weight: 700;">Assignments (${sm.evaluatedCount} / ${batchAssignments.length} Submitted)</h4>
          <p style="color: var(--fg-muted); font-size: 11px; margin-top: 2px;">
            Assignments for Batch ${student.batch}. Click [Inspect Code] to view task-level breakdown, code files, and transparency notes.
          </p>
        </div>

        <div class="table-wrap" style="margin-top: 8px; margin-bottom: 0;">
          <table class="score-detail-table">
            <thead>
              <tr>
                <th style="width: 70px; white-space: nowrap;">Code</th>
                <th>Assignment Title</th>
                <th style="width: 90px;">Status</th>
                <th style="width: 100px;">Submitted</th>
                <th style="width: 110px; text-align: right;">Score</th>
                <th style="width: 140px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${batchAssignments.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--fg-muted); padding: 16px;">No assignments scheduled for Batch ${student.batch} yet.</td></tr>
              ` : batchAssignments.map(meta => {
                const sub = (student.assignments || []).find(a => a.assignmentId === meta.id);
                if (sub) {
                  const ev = evaluateSubmission(sub);
                  return `
                    <tr>
                      <td style="white-space: nowrap;">
                        <button class="btn btn-sm profile-inspect-btn" data-student="${student.id}" data-assign="${meta.id}" style="padding: 2px 8px; font-weight: 700; cursor: pointer; white-space: nowrap;" title="Inspect ${meta.code} code & audit">
                          ${meta.code}
                        </button>
                      </td>
                      <td>
                        <span class="profile-inspect-btn" data-student="${student.id}" data-assign="${meta.id}" style="font-weight: 700; cursor: pointer; text-decoration: underline;" title="Inspect ${meta.code}">
                          ${meta.title}
                        </span>
                      </td>
                      <td><span class="tag-plain">${ev.status}</span></td>
                      <td style="font-size: 11px; color: var(--fg-muted);">${ev.submissionTime || "In-time"}</td>
                      <td style="text-align: right; font-weight: 700;">
                        ${ev.computedTotal.toFixed(2)} / ${meta.baseMax}
                        <div style="font-size: 10px; font-weight: normal; color: var(--fg-muted);">${ev.computedPercentage}</div>
                      </td>
                      <td style="text-align: center;">
                        <button class="btn btn-sm profile-inspect-btn" data-student="${student.id}" data-assign="${meta.id}">
                          [Inspect Code]
                        </button>
                      </td>
                    </tr>
                  `;
                } else {
                  return `
                    <tr style="opacity: 0.6; background: var(--bg-subtle);">
                      <td style="white-space: nowrap;"><strong>${meta.code}</strong></td>
                      <td>${meta.title}</td>
                      <td><span style="font-size: 10px; color: var(--fg-muted);">Upcoming</span></td>
                      <td>--</td>
                      <td style="text-align: right; color: var(--fg-muted);">-- / ${meta.baseMax}</td>
                      <td style="text-align: center; font-size: 10px; color: var(--fg-muted);">[Pending Release]</td>
                    </tr>
                  `;
                }
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Classes Section -->
      <div id="profileClassesSection" style="margin-bottom: 16px;">
        <div style="margin: 8px 0;">
          <h4 style="text-transform: uppercase; font-size: 12px; font-weight: 700;">Classes & Technical Workshops (${studentClasses.length} / ${batchClasses.length} Attended)</h4>
          <p style="color: var(--fg-muted); font-size: 11px; margin-top: 2px;">
            Hands-on classes & technical sessions for Batch ${student.batch}. 50.00 base participation points.
          </p>
        </div>

        <div class="table-wrap" style="margin-top: 8px; margin-bottom: 0;">
          <table class="score-detail-table">
            <thead>
              <tr>
                <th style="width: 70px; white-space: nowrap;">Code</th>
                <th>Workshop Title</th>
                <th style="width: 90px;">Status</th>
                <th style="width: 140px;">Date & Venue</th>
                <th style="width: 110px; text-align: right;">Points</th>
                <th style="width: 140px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${batchClasses.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--fg-muted); padding: 16px;">No classes scheduled for Batch ${student.batch} yet.</td></tr>
              ` : batchClasses.map(cMeta => {
                const attended = studentClasses.find(c => c.classId === cMeta.id);
                if (attended) {
                  return `
                    <tr>
                      <td style="white-space: nowrap;">
                        <button class="btn btn-sm profile-class-btn" data-class="${cMeta.id}" style="padding: 2px 8px; font-weight: 700; cursor: pointer; white-space: nowrap;" title="View ${cMeta.code} Details">
                          ${cMeta.code}
                        </button>
                      </td>
                      <td>
                        <span class="profile-class-btn" data-class="${cMeta.id}" style="font-weight: 700; cursor: pointer; text-decoration: underline;">
                          ${cMeta.title}
                        </span>
                        <div style="font-size: 10px; color: var(--fg-muted);">${escapeHtml(attended.remarks || "")}</div>
                      </td>
                      <td><span class="tag-plain" style="font-weight: 700;">${attended.status}</span></td>
                      <td style="font-size: 11px; color: var(--fg-muted);">${cMeta.date}<br><span style="font-size: 10px;">${cMeta.venue}</span></td>
                      <td style="text-align: right; font-weight: 700;">
                        ${attended.totalPts.toFixed(2)} / 50.00
                        <div style="font-size: 10px; font-weight: normal; color: var(--fg-muted);">Base Participation</div>
                      </td>
                      <td style="text-align: center;">
                        <button class="btn btn-sm profile-class-btn" data-class="${cMeta.id}">
                          [Class Details]
                        </button>
                      </td>
                    </tr>
                  `;
                } else {
                  return `
                    <tr style="opacity: 0.6; background: var(--bg-subtle);">
                      <td style="white-space: nowrap;"><strong>${cMeta.code}</strong></td>
                      <td>${cMeta.title}</td>
                      <td><span style="font-size: 10px; color: var(--fg-muted);">Absent</span></td>
                      <td style="font-size: 11px; color: var(--fg-muted);">${cMeta.date}</td>
                      <td style="text-align: right; color: var(--fg-muted);">0.00 / 50.00</td>
                      <td style="text-align: center;">
                        <button class="btn btn-sm profile-class-btn" data-class="${cMeta.id}">[Class Details]</button>
                      </td>
                    </tr>
                  `;
                }
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Filter tab button interaction
    const filterBtns = profileModalBody.querySelectorAll(".profile-filter-btn");
    const assignSection = profileModalBody.querySelector("#profileAssignmentsSection");
    const classSection = profileModalBody.querySelector("#profileClassesSection");

    filterBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        filterBtns.forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const filterVal = e.currentTarget.getAttribute("data-filter");
        if (filterVal === "assignments") {
          if (assignSection) assignSection.style.display = "block";
          if (classSection) classSection.style.display = "none";
        } else if (filterVal === "classes") {
          if (assignSection) assignSection.style.display = "none";
          if (classSection) classSection.style.display = "block";
        } else {
          if (assignSection) assignSection.style.display = "block";
          if (classSection) classSection.style.display = "block";
        }
      });
    });

    profileModalBody.querySelectorAll(".profile-inspect-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const sId = e.currentTarget.getAttribute("data-student");
        const aId = e.currentTarget.getAttribute("data-assign");
        profileModal.style.display = "none";
        openAssignmentAuditModal(sId, aId, true);
      });
    });

    profileModalBody.querySelectorAll(".profile-class-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const cId = e.currentTarget.getAttribute("data-class");
        profileModal.style.display = "none";
        openClassDetailsModal(cId, true, student.id);
      });
    });

    profileModal.style.display = "flex";
  }

  // Open Assignment Audit Modal (Detailed task breakdown, code, transparency notes)
  function openAssignmentAuditModal(studentId, assignmentId, fromProfile = false) {
    const student = HACK_DATA.students.find(s => s.id === studentId);
    if (!student) return;

    const targetAssignId = assignmentId || (activeScope === 'all' ? 'a1' : activeScope);
    const meta = HACK_DATA.assignments.find(a => a.id === targetAssignId) || { code: targetAssignId.toUpperCase(), baseMax: 150 };
    const aSub = student.assignments.find(a => a.assignmentId === targetAssignId) || student.assignments[0];
    const ev = evaluateSubmission(aSub);
    if (!ev) return;
    const sc = ev.computedScores;

    if (fromProfile) {
      modalBackBtn.style.display = 'inline-block';
      modalBackBtn.onclick = () => {
        detailModal.style.display = 'none';
        openStudentProfileModal(studentId);
      };
    } else {
      modalBackBtn.style.display = 'none';
    }

    modalTitle.textContent = `[${meta.code} Audit] Roll ${student.roll} - Score: ${ev.computedTotal.toFixed(2)} / ${meta.baseMax}`;
    modalInstructorNoteText.textContent = `"${ev.instructorTransparencyNote}"`;

    let components = [
      { key: 'participation', name: 'Participation' },
      { key: 'inTime', name: 'In-Time Submission (5m grace)' },
      { key: 'task1', name: 'Task 1: Dual LED Blinker' },
      { key: 'task2', name: 'Task 2: Software PWM' },
      { key: 'task3', name: 'Task 3: Sonar Reader (Hardware Accel)' },
      { key: 'documentation', name: 'Inline Code Comments' },
      { key: 'bonus_ib1', name: 'Bonus i.b.1: Generic N-LEDs' },
      { key: 'bonus_ib2', name: 'Bonus i.b.2: Hardware Port Opt.' },
      { key: 'bonus_ib3', name: 'Bonus i.b.3: Multitasking Systems' },
      { key: 'bonus_iib1', name: 'Bonus ii.b.1: HW PWM Acceleration' },
      { key: 'bonus_iib2', name: 'Bonus ii.b.2: Custom PWM Servo Control' },
      { key: 'bonus_iiib', name: 'Bonus iii.b: Smart Dustbin Simulation' }
    ];

    if (meta.rubric && Object.keys(meta.rubric).length > 0) {
      components = Object.keys(meta.rubric).map(k => ({
        key: k,
        name: meta.rubric[k].name || k
      }));
    }

    modalScoreTableBody.innerHTML = components.map(c => {
      const item = sc[c.key] || { max: 0, inst: 0, llm: 0, final: 0, note: '-', llmReasoning: '-' };
      const reasoning = item.llmReasoning || item.note || '-';
      return `
        <tr>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>${item.max}</td>
          <td>${item.inst}</td>
          <td>${item.llm}</td>
          <td><strong>${item.final}</strong></td>
          <td>
            <div style="font-size: 11px; line-height: 1.4;">
              <span style="color: var(--fg); font-weight: 600; display: block; margin-bottom: 2px;">LLM Reasoning:</span>
              <span style="color: var(--fg-muted);">${escapeHtml(reasoning)}</span>
            </div>
          </td>
        </tr>
      `;
    }).join('') + `
      <tr style="background: var(--bg-alt); font-weight: bold;">
        <td>TOTAL SCORE (BASE + BONUS)</td>
        <td>${meta.totalMax || 225}</td>
        <td colspan="2" style="text-align: center;">Me(60%) + LLM(40%)</td>
        <td>${ev.computedTotal.toFixed(2)}</td>
        <td>${ev.computedPercentage} (150 base)</td>
      </tr>
    `;

    // Code Viewer
    if (ev.codeFiles && ev.codeFiles.length > 0) {
      modalFileTabs.innerHTML = ev.codeFiles.map((f, i) => `
        <button class="f-btn ${i === 0 ? 'active' : ''}" data-idx="${i}">[${escapeHtml(f.name)}]</button>
      `).join('');

      modalCodeDisplay.textContent = ev.codeFiles[0].content;

      modalFileTabs.querySelectorAll('.f-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          modalFileTabs.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          modalCodeDisplay.textContent = ev.codeFiles[idx].content;
        });
      });
    } else {
      modalFileTabs.innerHTML = '<span>No code files downloaded</span>';
      modalCodeDisplay.textContent = `// No local code files.\n// Note: Student's Google Drive link requires permission access:\n// ${ev.driveLink}`;
    }

    // Subagent Critique (Student-Specific AI Audit Report)
    const modelUsed = meta.llmModel || 'Gemini 3.8 Flash (Medium)';
    let critiqueHtml = `
      <div class="callout" style="background: var(--bg-alt); margin-bottom: 14px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">Evaluator Model:</span>
        <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${escapeHtml(modelUsed)}</div>
        <div style="font-size: 11px; color: var(--fg-muted); margin-top: 2px;">Objective technical code review executed per assignment rubric with prompt-injection defense.</div>
      </div>
    `;

    if (ev.auditReport) {
      critiqueHtml += `<div class="audit-report-container">${renderMarkdownSafe(ev.auditReport)}</div>`;
    } else {
      critiqueHtml += `
        <div class="callout">
          <h4>Technical Evaluation Status</h4>
          <p>Detailed technical markdown audit report is pending or not generated for Roll ${escapeHtml(student.roll)}.</p>
        </div>
      `;
    }
    modalCritiqueDisplay.innerHTML = critiqueHtml;

    // Metadata
    modalStudentCommentText.textContent = `"${ev.studentComment}"`;
    modalDriveLinkAnchor.href = ev.driveLink;
    modalDriveLinkAnchor.textContent = ev.driveLink;
    if (ev.status === 'Pending Drive Access') {
      modalDriveWarning.innerHTML = `
        <p style="color: red; font-weight: bold;">
          [!] WARNING: Google Drive folder is permission-locked to Google Sign-in. Student must set sharing to "Anyone with the link can view" for code re-scoring.
        </p>
      `;
    } else {
      modalDriveWarning.innerHTML = `<p style="color: green;">[+] Verified: Files retrieved and analyzed.</p>`;
    }

    switchModalPane('scorecardPane');
    detailModal.style.display = 'flex';
  }

  // Modal Tab Switching
  document.querySelectorAll('.m-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const paneId = e.currentTarget.getAttribute('data-pane');
      switchModalPane(paneId);
    });
  });

  function switchModalPane(paneId) {
    document.querySelectorAll('.m-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-pane') === paneId);
    });
    document.querySelectorAll('.pane').forEach(p => {
      p.classList.toggle('active', p.id === paneId);
    });
  }

  // Close Modal Handlers
  modalCloseBtn.addEventListener('click', () => detailModal.style.display = 'none');
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) detailModal.style.display = 'none';
  });

  profileModalCloseBtn.addEventListener('click', () => profileModal.style.display = 'none');
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) profileModal.style.display = 'none';
  });

  // Open Class Details Modal (Session recording, curriculum, and metadata)
  function openClassDetailsModal(classId, fromProfile = false, fromStudentId = null) {
    const classMeta = (HACK_DATA.classes || []).find(c => c.id === classId) || (HACK_DATA.classes && HACK_DATA.classes[0]);
    if (!classMeta || !classDetailModal) return;

    classModalTitle.textContent = `[${classMeta.code}] ${classMeta.title}`;

    if (fromProfile) {
      classModalBackBtn.style.display = "inline-block";
      classModalBackBtn.onclick = () => {
        classDetailModal.style.display = "none";
        if (fromStudentId) openStudentProfileModal(fromStudentId);
      };
    } else {
      classModalBackBtn.style.display = "none";
    }

    classModalBody.innerHTML = `
      <div class="callout" style="background: var(--bg-subtle); border-left: 4px solid var(--border); margin-bottom: 16px;">
        <div>
          <span class="badge badge-subagent">${classMeta.code}</span>
          <div style="font-weight: 700; font-size: 14px; margin-top: 4px;">${escapeHtml(classMeta.title)}</div>
          <p style="font-size: 11px; color: var(--fg-muted); margin-top: 4px;">Hands-on Embedded & Robotics Workshop for Batches 2K23 & 2K24</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border-light); font-size: 11px;">
          <div><strong>DATE:</strong> ${classMeta.date}</div>
          <div><strong>TIME:</strong> ${classMeta.time}</div>
          <div><strong>VENUE:</strong> ${classMeta.venue}</div>
          <div><strong>INSTRUCTORS:</strong> Tahmid Hossain Chowdhury Mahin (2K22), Isaac Aneek Sarkar</div>
        </div>
      </div>

      <!-- Workshop Submenus / Tabs -->
      <div class="class-submenus">
        <button class="btn btn-sm class-tab-btn class-modal-tab-btn active" type="button" data-tab="curriculum">Session & Curriculum</button>
        <button class="btn btn-sm class-tab-btn class-modal-tab-btn" type="button" data-tab="quiz-bonus">Quiz & Bonus Challenges</button>
      </div>

      <!-- Tab 1: Curriculum Content -->
      <div id="modalCurriculumTabContent" style="display: block;">
        <div class="callout" style="background: var(--bg); font-size: 12px; line-height: 1.6; margin-bottom: 16px; padding: 14px;">
          <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">Workshop Curriculum & Technical Modules</h4>
          <div style="font-size: 11px; color: var(--fg);">
            <div style="font-weight: 700; margin-top: 6px;">Module 1: ROS 2 Distributed Robotics Middleware (Tahmid Hossain Chowdhury Mahin, 2K22)</div>
            <p style="color: var(--fg-muted); margin-bottom: 8px;">DDS decentralized node discovery, ament package architecture, publisher/subscriber QoS policies, and Gazebo HIL digital twin simulation.</p>
            
            <div style="margin: 10px 0 14px 0; padding: 10px 12px; background: var(--bg-alt); border: 1px dashed var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: gap: 8px;">
              <div>
                <strong style="font-size: 11px;">ASSIGNMENT SUBMISSION:</strong>
                <span style="font-size: 11px; color: var(--fg-muted); margin-left: 6px;">Hands-on Lab Challenge & Code Submission</span>
              </div>
              <span class="badge" style="background: var(--bg); border: 1px solid var(--border); font-size: 10px; font-weight: 700;">[NOT PUBLISHED]</span>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
              <span style="font-weight: 700;">Module 2: RTOS on Embedded Silicon (Isaac Aneek Sarkar)</span>
              ${classMeta.repoUrl ? `<a href="${classMeta.repoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="font-size: 10px; font-weight: 700; padding: 2px 6px;">[GitHub RTOS Repo ↗]</a>` : ""}
            </div>
            <p style="color: var(--fg-muted); margin-bottom: 8px;">FreeRTOS on ESP32 (ESP-IDF & PlatformIO): Super-loop bottlenecks vs preemptive priority scheduling, non-blocking vTaskDelay/vTaskDelayUntil, dual-core SMP & core pinning (Core 0 PRO_CPU vs Core 1 APP_CPU), shared buffer race conditions, and mutex synchronization with priority inheritance.</p>

            <div style="margin: 10px 0 14px 0; padding: 10px 12px; background: var(--bg-alt); border: 1px dashed var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong style="font-size: 11px;">ASSIGNMENT SUBMISSION:</strong>
                <span style="font-size: 11px; color: var(--fg-muted); margin-left: 6px;">Hands-on Lab Challenge & Code Submission</span>
              </div>
              <span class="badge" style="background: var(--bg); border: 1px solid var(--border); font-size: 10px; font-weight: 700;">[NOT PUBLISHED]</span>
            </div>
          </div>

          <!-- Session Recording Video Container (Inside Curriculum Section, After Modules) -->
          <div class="video-card" style="margin-top: 14px;">
            <div class="video-header-bar">
              <span>[SESSION RECORDING: ROS 2 SIMULATION & RTOS DEMO]</span>
              <span style="color: var(--fg-muted); font-size: 10px;">FastStart H.264</span>
            </div>
            <div class="video-wrapper" style="position: relative; width: 100%; background: #000;">
              <video id="modalVideoPlayer" controls preload="metadata" style="width: 100%; max-height: 380px; display: block; margin: 0 auto;">
                <source src="${rootPath}media/classes/class-01/ROS.mp4" type="video/mp4">
                Your browser does not support HTML5 video streaming.
              </video>
            </div>
            <div class="video-footer-bar" style="padding: 8px 12px; background: var(--bg-subtle); border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-size: 10px; font-weight: 700; color: var(--fg-muted);">JUMP TO:</span>
                <button class="btn btn-sm seek-pill" type="button" data-time="0" style="padding: 2px 6px; font-size: 10px; font-weight: 700;">[00:00] ROS 2 Simulation</button>
                <button class="btn btn-sm seek-pill" type="button" data-time="68" style="padding: 2px 6px; font-size: 10px; font-weight: 700;">[01:08] Node Topics</button>
                <button class="btn btn-sm seek-pill" type="button" data-time="132" style="padding: 2px 6px; font-size: 10px; font-weight: 700;">[02:12] RTOS Concurrency</button>
              </div>
              <div style="font-size: 10px; color: var(--fg-dim);">[Space: Play/Pause | M: Mute | F: Fullscreen]</div>
            </div>
          </div>

          <!-- Session Volunteers (Collapsed at the end) -->
          <details class="callout" style="margin-top: 14px; background: var(--bg-alt); border: 1px dashed var(--border); padding: 0;">
            <summary style="padding: 8px 12px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;">
              <span>VOLUNTEER & SESSION SUPPORT</span>
              <span style="font-size: 10px; color: var(--fg-muted); font-family: var(--font-mono);">[Click to toggle]</span>
            </summary>
            <div style="padding: 10px 12px; border-top: 1px dashed var(--border-light); font-size: 11px;">
              <strong style="color: var(--fg-dim);">VOLUNTEER:</strong> <span>Saleh Sadid Mir</span>
            </div>
          </details>
        </div>
      </div>

      <!-- Tab 2: Quiz & Bonus Content (Reserved / Empty for this class) -->
      <div id="modalQuizBonusTabContent" style="display: none;">
        <div class="callout" style="padding: 24px; text-align: center; background: var(--bg-subtle); border: 1px dashed var(--border); margin-bottom: 16px;">
          <div style="font-weight: 700; font-size: 13px; text-transform: uppercase; margin-bottom: 6px;">[QUIZ & BONUS POOL: NOT SCHEDULED]</div>
          <p style="font-size: 12px; color: var(--fg-muted); max-width: 520px; margin: 0 auto; line-height: 1.5;">
            No live quizzes or interactive bonus problem sets were scheduled for this introductory workshop session. All 50.00 base participation points were awarded for verified session attendance.
          </p>
          <div style="margin-top: 14px;">
            <span class="badge" style="background: var(--bg); border: 1px solid var(--border); font-size: 10px; font-weight: 700;">STATUS: EMPTY (0 PTS ASSIGNED)</span>
          </div>
        </div>
      </div>
    `;

    // Attach submenus tab click listeners
    classModalBody.querySelectorAll(".class-modal-tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const targetTab = e.currentTarget.getAttribute("data-tab");
        classModalBody.querySelectorAll(".class-modal-tab-btn").forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");

        const currContent = classModalBody.querySelector("#modalCurriculumTabContent");
        const qbContent = classModalBody.querySelector("#modalQuizBonusTabContent");
        if (targetTab === "curriculum") {
          if (currContent) currContent.style.display = "block";
          if (qbContent) qbContent.style.display = "none";
        } else {
          if (currContent) currContent.style.display = "none";
          if (qbContent) qbContent.style.display = "block";
        }
      });
    });

    classDetailModal.style.display = "flex";
  }

  if (classModalCloseBtn) {
    classModalCloseBtn.addEventListener("click", () => classDetailModal.style.display = "none");
  }
  if (classDetailModal) {
    classDetailModal.addEventListener("click", (e) => {
      if (e.target === classDetailModal) classDetailModal.style.display = "none";
    });
  }
  if (btnClassCurriculumModal) {
    btnClassCurriculumModal.addEventListener("click", () => {
      openClassDetailsModal(activeScope.startsWith("c") ? activeScope : "c1", false);
    });
  }

  // Global seek-pill click listener (works across class page and modal)
  document.addEventListener("click", (e) => {
    const pill = e.target.closest(".seek-pill");
    if (!pill) return;
    const time = parseFloat(pill.getAttribute("data-time"));
    if (isNaN(time)) return;

    let video = pill.closest(".video-card") ? pill.closest(".video-card").querySelector("video") : null;
    if (!video) {
      video = document.getElementById("classVideoPlayer") || document.getElementById("modalVideoPlayer");
    }
    if (video) {
      const applySeek = () => {
        try {
          video.currentTime = time;
          video.play().catch(() => {});
        } catch (err) {}
      };
      if (video.readyState >= 1) {
        applySeek();
      } else {
        video.addEventListener("loadedmetadata", applySeek, { once: true });
        video.addEventListener("canplay", applySeek, { once: true });
        try { video.load(); } catch (err) {}
        applySeek();
      }
    }
  });

  // Dedicated class page submenus tab switching
  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".class-page-tab-btn");
    if (!tabBtn) return;
    const targetTab = tabBtn.getAttribute("data-tab");
    document.querySelectorAll(".class-page-tab-btn").forEach(b => b.classList.remove("active"));
    tabBtn.classList.add("active");

    const currContent = document.getElementById("pageCurriculumTabContent");
    const qbContent = document.getElementById("pageQuizBonusTabContent");
    if (targetTab === "curriculum") {
      if (currContent) currContent.style.display = "block";
      if (qbContent) qbContent.style.display = "none";
    } else {
      if (currContent) currContent.style.display = "none";
      if (qbContent) qbContent.style.display = "block";
    }
  });

  // Global video keyboard shortcuts (Space: play/pause, M: mute, F: fullscreen)
  document.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    const activeVideo = document.getElementById("classVideoPlayer") || document.getElementById("modalVideoPlayer");
    if (!activeVideo) return;

    if (e.code === "Space") {
      e.preventDefault();
      if (activeVideo.paused) activeVideo.play().catch(() => {});
      else activeVideo.pause();
    } else if (e.code === "KeyM") {
      activeVideo.muted = !activeVideo.muted;
    } else if (e.code === "KeyF") {
      if (!document.fullscreenElement) {
        if (activeVideo.requestFullscreen) activeVideo.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }
  });

  // Open Assignment-Specific Rubric Modal
  function openRubricModal(assignmentId) {
    const targetAssignId = assignmentId || (activeScope === 'all' ? 'a1' : activeScope);
    const meta = HACK_DATA.assignments.find(a => a.id === targetAssignId) || HACK_DATA.assignments[0];
    if (!meta) return;

    rubricModalTitle.textContent = `[${meta.code}] Rubric & Criteria: ${meta.title}`;

    rubricModalContent.innerHTML = `
      <div class="callout" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="font-weight: 700; text-transform: uppercase;">Assignment: ${meta.code}</span>
          <div style="font-size: 11px; color: var(--fg-muted);">${meta.title}</div>
        </div>
        <div>
          <span class="tag-plain" style="font-weight: 700;">Base Max: ${meta.baseMax} pts</span>
          <span class="tag-plain" style="font-weight: 700;">Bonus Pool: +${meta.bonusMax} pts</span>
        </div>
      </div>

      <div class="callout">
        <h4>Base Points Breakdown (${meta.baseMax} Marks Total)</h4>
        <p>&bull; <strong>Participation</strong>: 55 Marks (Full marks for authentic effort)<br>
           &bull; <strong>In-Time Submission</strong>: 15 Marks (5-minute grace window applied)<br>
           &bull; <strong>Task 1 (Dual LED Blinker)</strong>: 25 Marks (Non-blocking millis() vs blocking delay)<br>
           &bull; <strong>Task 2 (Software PWM)</strong>: 25 Marks (Microsecond duty cycle without analogWrite)<br>
           &bull; <strong>Task 3 (Sonar Reader)</strong>: 25 Marks (Hardware acceleration via interrupts)<br>
           &bull; <strong>Inline Comments</strong>: 5 Marks (Directly in code files)<br>
           &bull; <strong>Simulation Video</strong>: Scoring Removed (0 Marks)</p>
      </div>
      <div class="callout">
        <h4>Bonus Pool (+${meta.bonusMax} Marks Total - Adds on top of ${meta.baseMax})</h4>
        <p>&bull; <strong>i.b.1 (Generic N-LEDs)</strong>: 10 Marks<br>
           &bull; <strong>i.b.2 (Hardware Registers DDRx/PORTx)</strong>: 15 Marks<br>
           &bull; <strong>i.b.3 (Multitasking Systems)</strong>: 10 Marks<br>
           &bull; <strong>ii.b.1 (Timer Registers PWM)</strong>: 15 Marks<br>
           &bull; <strong>ii.b.2 (Custom PWM Servo Control)</strong>: 10 Marks<br>
           &bull; <strong>iii.b (Smart Dustbin Simulation)</strong>: 15 Marks</p>
      </div>
      <div class="callout">
        <h4>Hybrid Scoring Formula</h4>
        <p><code>Task & Bonus Final = (Instructor * 0.6) + (LLM * 0.4)</code></p>
        <div style="font-size: 11px; color: var(--fg-muted); margin-top: 4px;">Evaluator Model: ${escapeHtml(meta.llmModel || 'Gemini 3.8 Flash (Medium)')}</div>
      </div>
    `;

    rubricModal.style.display = 'flex';
  }

  // Rubric Modal Handlers
  if (rubricToggleBtn) {
    rubricToggleBtn.addEventListener('click', () => openRubricModal(activeScope));
  }
  if (rubricCloseBtn) {
    rubricCloseBtn.addEventListener('click', () => {
      if (rubricModal) rubricModal.style.display = 'none';
    });
  }
  if (rubricModal) {
    rubricModal.addEventListener('click', (e) => {
      if (e.target === rubricModal) rubricModal.style.display = 'none';
    });
  }

  // Print
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  // Export CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
    if (activeScope === 'all') {
      const headers = [
        'Rank', 'Roll', 'Batch', 'Status', 'Cumulative Points', 'Completed Assignments'
      ];
      const evaluatedList = HACK_DATA.students
        .filter(s => s.batch === activeBatch)
        .map(s => ({ ...s, scoreModel: getStudentScoreModel(s) }))
        .sort((a, b) => b.scoreModel.cumulativeScore - a.scoreModel.cumulativeScore);

      const rows = evaluatedList.map((s, idx) => {
        const sm = s.scoreModel;
        const assignsStr = sm.assignmentSummaries.map(as => `${as.code}: ${as.score.toFixed(2)} pts (${as.percentage})`).join('; ');
        return [
          idx + 1,
          `"${s.roll}"`,
          `"${s.batch}"`,
          `"${sm.status}"`,
          sm.cumulativeScore.toFixed(2),
          `"${assignsStr}"`
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encoded = encodeURI(csvContent);
      const link = document.createElement('a');
      link.href = encoded;
      link.download = `HACK_Elo_Cumulative_Ratings_${activeBatch}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      'Rank', 'Roll', 'Batch', 'Status', 'Total Score', 'Max Score', 'Percentage',
      'Participation (55)', 'In-Time (15)', 'Task 1 (25)', 'Task 2 (25)', 'Task 3 (25)',
      'Inline Comments (5)', 'Bonus (75)', 'Instructor Notes', 'Drive Link'
    ];

    const evaluatedList = HACK_DATA.students
      .filter(s => s.batch === activeBatch)
      .map(s => ({ ...s, scoreModel: getStudentScoreModel(s) }))
      .sort((a, b) => {
        const scA = a.scoreModel.isCumulative ? a.scoreModel.cumulativeScore : a.scoreModel.assignmentData.computedTotal;
        const scB = b.scoreModel.isCumulative ? b.scoreModel.cumulativeScore : b.scoreModel.assignmentData.computedTotal;
        return scB - scA;
      });

    const rows = evaluatedList.map((s, idx) => {
      const a = s.scoreModel.assignmentData;
      const sc = a.computedScores;
      return [
        idx + 1,
        `"${s.roll}"`,
        `"${s.batch}"`,
        `"${a.status}"`,
        a.computedTotal.toFixed(2),
        150,
        `"${a.computedPercentage}"`,
        sc.participation.final,
        sc.inTime.final,
        sc.task1.final,
        sc.task2.final,
        sc.task3.final,
        sc.documentation.final,
        sc.bonus.final,
        `"${a.instructorTransparencyNote.replace(/"/g, '""')}"`,
        `"${a.driveLink}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `HACK_Elo_Ratings_${activeBatch}_${activeScope}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    });
  }

  // Switch Scope via Assignment Dropdown
  if (assignmentSelect) {
    assignmentSelect.addEventListener('change', (e) => {
      const selectedVal = e.target.value;
      if (!selectedVal) return;
      window.location.href = selectedVal;
    });
  }

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      render();
    });
  }

  if (statusFilterSelect) {
    statusFilterSelect.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      render();
    });
  }

  // Initial load: parse CSV then render
  loadCSVData().then(() => {
    render();
  });
});
