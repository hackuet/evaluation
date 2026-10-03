# HACK Elo Rating Board
**Hardware Acceleration Club of KUET (HACK)**

A lightweight, monotonic, CSV-driven technical rating board and evaluation platform for embedded systems and hardware programming assignments.

---

## Architecture & Features

- **Clean Technical UI**: High-contrast engineering layout with clear tabular views.
- **CSV-Driven Human Grading**: Instructors can edit grades and transparency notes directly in simple spreadsheet CSV files (`2k25/<assignment>/<assignment>.csv`).
- **Dynamic Dual-Mode Ranking**:
  - **Cumulative Overall View**: Global rankings across all assignments.
  - **Assignment Details View**: Itemized task breakdowns, microsecond timing checks, and collapsible instructor transparency notes.
- **Hybrid Scoring Formula**:
  $$\text{Task \& Bonus Final Mark} = (\text{Instructor Mark} \times 0.6) + (\text{LLM Subagent Mark} \times 0.4)$$
  Evaluator LLM: **Gemini 3.8 Flash (Medium Thinking)**.
- **Automatic Rank Calculation**: Ranks are computed dynamically in real time without hardcoding.
- **Auditing & Code Inspection**: Embedded terminal-style code viewer for submitted sketches with zero external build dependencies.

---

## Directory Structure

```
├── .gitignore               # Strictly excludes video submissions (*.mp4, *.webm, etc.)
├── index.html               # Main single-page application
├── style.css                # Stylesheet for desktop and mobile views
├── app.js                   # Client-side dynamic CSV parser & ranking engine
├── data.js                  # Pre-bundled dataset and fallback data store
├── generate_data.py         # Data compiler script
└── 2k25/
    ├── template.csv         # Starter CSV template for future assignments
    ├── a1.html              # Dedicated Assignment 1 page with distinct URL
    └── assignment-1/
        ├── assignment-1.csv # Editable CSV with human marks and comments (same folder!)
        ├── QUESTION.md      # Original assignment prompt and guidelines
        ├── RUBRIC.md        # Official 150-base rubric and bonus criteria
        ├── EVALUATION_PROMPT.md # Autonomous evaluator subagent prompt
        ├── submissions/     # Code submissions (videos gitignored)
        └── evaluations/     # Markdown technical evaluation reports
```

---

## Grading Policy (Assignment 1 - Batch 2k25)

### Base Points (150 Marks Total)
- **Participation**: **55 Marks** (Awarded for authentic attempts)
- **In-Time Submission**: **15 Marks** (Includes 5-minute grace period past deadline)
- **Task 1 (Dual LED Blinker)**: **25 Marks** (Non-blocking `millis()` concurrency vs blocking `delay()`)
- **Task 2 (Software PWM)**: **25 Marks** (Custom microsecond duty cycle without `analogWrite()`)
- **Task 3 (Sonar Reader)**: **25 Marks** (Hardware acceleration via interrupts)
- **Inline Code Comments**: **5 Marks** (Directly in code files)
- **Simulation Videos**: **Scoring Removed (0 Marks)**

### Bonus Pool (+75 Marks Total - Adds on top of 150)
- **i.b.1 (Generic $N$-LEDs)**: 10 Marks
- **i.b.2 (Hardware Registers DDRx/PORTx)**: 15 Marks
- **i.b.3 (Multitasking Systems)**: 10 Marks
- **ii.b.1 (Timer Registers PWM)**: 15 Marks
- **ii.b.2 (Custom PWM Servo Control)**: 10 Marks
- **iii.b (Smart Dustbin Simulation)**: 15 Marks

---

## How to Add or Edit Grades

1. Open `2k25/assignment-1/assignment-1.csv` in Excel, Google Sheets, or any text editor.
2. Edit instructor marks (`task1_inst`, `task2_inst`, etc.) and the `instructor_note` column.
3. Save the CSV and refresh the web browser (or re-run `python3 generate_data.py` to regenerate `data.js`).
4. For new assignments, copy `2k25/template.csv` to `2k25/<assignment-name>/<assignment-name>.csv`.

---

## Local Development & Preview

Run a simple local HTTP server from the repository root:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## License
MIT License &copy; 2026 Hardware Acceleration Club of KUET (HACK).
