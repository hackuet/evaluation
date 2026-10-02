#!/usr/bin/env python3
"""
HACK Data Generator & Pug Page Compiler
Auto-generates data.js from CSV grading sheets and submission code files,
extracts per-task LLM reasoning from evaluation reports,
and compiles multi-page Pug templates.

Usage: python3 generate_data.py
"""

import os
import re
import csv
import json
import glob
import subprocess

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(REPO_ROOT, "data.js")

VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv", ".wmv"}

def get_code_files(batch, assignment_name, roll):
    """Scan submissions directory for text/code/hardware files (strictly ignoring videos)."""
    sub_dir = os.path.join(REPO_ROOT, batch, assignment_name, "submissions", roll)
    if not os.path.exists(sub_dir):
        return []
    
    code_files = []
    for root, _, files in os.walk(sub_dir):
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext in VIDEO_EXTS:
                continue  # Never include video files
            fpath = os.path.join(root, f)
            rel_name = os.path.relpath(fpath, sub_dir)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()
                code_files.append({
                    "name": rel_name,
                    "content": content
                })
            except Exception as e:
                print(f"Warning: could not read {fpath}: {e}")
    return code_files

def get_evaluation_audit(batch, assignment_name, roll):
    """Read markdown evaluation audit report if present and extract per-component LLM remarks."""
    md_path = os.path.join(REPO_ROOT, batch, assignment_name, "evaluations", f"{roll}.md")
    if not os.path.exists(md_path):
        return {"report": None, "remarks": {}}

    try:
        with open(md_path, "r", encoding="utf-8", errors="ignore") as fp:
            content = fp.read()
    except Exception as e:
        print(f"Warning: could not read {md_path}: {e}")
        return {"report": None, "remarks": {}}

    remarks = {}
    # Parse table rows in markdown table: | Category | Component | ... | Remarks |
    for line in content.splitlines():
        line_clean = line.strip()
        if not line_clean.startswith("|") or "---" in line_clean:
            continue
        parts = [p.strip() for p in line_clean.split("|")[1:-1]]
        if len(parts) >= 6:
            # Table columns: Category, Component, Max, Inst, LLM, Combined, Remarks
            component_col = parts[1].lower()
            remark_col = parts[-1]
            if "participation" in component_col:
                remarks["participation"] = remark_col
            elif "in-time" in component_col or "time" in component_col:
                remarks["inTime"] = remark_col
            elif "task 1" in component_col or "task1" in component_col:
                remarks["task1"] = remark_col
            elif "task 2" in component_col or "task2" in component_col:
                remarks["task2"] = remark_col
            elif "task 3" in component_col or "task3" in component_col:
                remarks["task3"] = remark_col
            elif "comment" in component_col or "documentation" in component_col or "clarity" in component_col:
                remarks["documentation"] = remark_col
            elif "bonus" in component_col:
                remarks["bonus"] = remark_col

    return {
        "report": content,
        "remarks": remarks
    }

def discover_batches():
    """Dynamically scan repository root for academic batch folders (e.g. 2k24, 2k25, 2k26)."""
    batch_dirs = []
    for item in os.listdir(REPO_ROOT):
        item_path = os.path.join(REPO_ROOT, item)
        if os.path.isdir(item_path) and re.match(r"^\d+k\d+$", item):
            batch_dirs.append({
                "id": item,
                "name": f"Batch {item}",
                "active": (item == "2k25")
            })
    batch_dirs.sort(key=lambda b: b["id"], reverse=True)
    if not batch_dirs:
        batch_dirs = [{"id": "2k25", "name": "Batch 2k25", "active": True}]
    return batch_dirs

def discover_assignments(batches):
    """Discover all assignments across batch directories."""
    assignments = []
    for b in batches:
        batch_id = b["id"]
        batch_path = os.path.join(REPO_ROOT, batch_id)
        if not os.path.isdir(batch_path):
            continue

        for folder in sorted(os.listdir(batch_path)):
            assign_path = os.path.join(batch_path, folder)
            if not os.path.isdir(assign_path):
                continue

            # Look for assignment indicators: QUESTION.md, meta.json, or assignment CSV
            q_path = os.path.join(assign_path, "QUESTION.md")
            meta_path = os.path.join(assign_path, "meta.json")
            has_csv = len(glob.glob(os.path.join(assign_path, "*.csv"))) > 0

            if os.path.exists(q_path) or os.path.exists(meta_path) or has_csv:
                meta = {}
                if os.path.exists(meta_path):
                    try:
                        with open(meta_path, "r", encoding="utf-8") as fp:
                            meta = json.load(fp)
                    except Exception as e:
                        print(f"Warning: error loading {meta_path}: {e}")

                num_match = re.search(r"\d+", folder)
                assign_num = num_match.group(0) if num_match else "1"
                assign_id = meta.get("id", f"a{assign_num}")
                assign_code = meta.get("code", f"A-{int(assign_num):02d}")

                question_text = ""
                if os.path.exists(q_path):
                    with open(q_path, "r", encoding="utf-8") as fp:
                        question_text = fp.read().strip()

                meta_entry = {
                    "id": assign_id,
                    "folder": folder,
                    "code": assign_code,
                    "batch": batch_id,
                    "title": meta.get("title", f"Assignment {assign_num}: Dual LED, Software PWM & Sonar" if assign_num == "1" else f"Assignment {assign_num}"),
                    "status": meta.get("status", "Active"),
                    "llmModel": meta.get("llmModel", "Gemini 3.8 Flash (Medium Thinking)"),
                    "deadline": meta.get("deadline", "2026-10-01 23:59"),
                    "baseMax": meta.get("baseMax", 150),
                    "bonusMax": meta.get("bonusMax", 75),
                    "totalMax": meta.get("totalMax", 225),
                    "question": question_text,
                    "rubric": meta.get("rubric", {
                        "participation": {"max": 55, "name": "Participation"},
                        "inTime": {"max": 15, "name": "In-Time (5m grace)"},
                        "task1": {"max": 25, "name": "Task 1: Dual LED Blinker"},
                        "task2": {"max": 25, "name": "Task 2: Software PWM"},
                        "task3": {"max": 25, "name": "Task 3: Sonar Reader (HW Accel)"},
                        "documentation": {"max": 5, "name": "Inline Comments"},
                        "bonus": {"max": 75, "name": "Bonus Pool (i.b.1–iii.b)"}
                    })
                }
                assignments.append(meta_entry)

    if not assignments:
        # Fallback to assignment 1 if empty
        assignments.append({
            "id": "a1",
            "folder": "assignment-1",
            "code": "A-01",
            "batch": "2k25",
            "title": "Assignment 1: Dual LED, Software PWM & Sonar",
            "status": "Active",
            "llmModel": "Gemini 3.8 Flash (Medium Thinking)",
            "deadline": "2026-10-01 23:59",
            "baseMax": 150,
            "bonusMax": 75,
            "totalMax": 225,
            "question": "",
            "rubric": {
                "participation": {"max": 55, "name": "Participation"},
                "inTime": {"max": 15, "name": "In-Time (5m grace)"},
                "task1": {"max": 25, "name": "Task 1: Dual LED Blinker"},
                "task2": {"max": 25, "name": "Task 2: Software PWM"},
                "task3": {"max": 25, "name": "Task 3: Sonar Reader (HW Accel)"},
                "documentation": {"max": 5, "name": "Inline Comments"},
                "bonus": {"max": 75, "name": "Bonus Pool (i.b.1–iii.b)"}
            }
        })
    return assignments

def main():
    batches = discover_batches()
    assignments_meta = discover_assignments(batches)

    students_map = {}

    # Read CSV files in all batch subdirectories
    for b in batches:
        batch_id = b["id"]
        csv_pattern = os.path.join(REPO_ROOT, batch_id, "*", "*.csv")
        for csv_path in sorted(glob.glob(csv_pattern)):
            basename = os.path.basename(csv_path)
            if basename == "template.csv":
                continue

            parts = csv_path.split(os.sep)
            assign_folder = parts[-2]
            assign_meta = next((a for a in assignments_meta if a["batch"] == batch_id and a["folder"] == assign_folder), None)
            assign_id = assign_meta["id"] if assign_meta else ("a1" if "1" in assign_folder else assign_folder)

            with open(csv_path, "r", encoding="utf-8") as fp:
                reader = csv.DictReader(fp)
                for row in reader:
                    roll = row.get("roll", "").strip()
                    if not roll:
                        continue

                    row_batch = row.get("batch", batch_id).strip() or batch_id
                    status = row.get("status", "Evaluated").strip()
                    sub_time = row.get("submission_time", "").strip()
                    drive_link = row.get("drive_link", "").strip()
                    inst_note = row.get("instructor_note", "").strip()
                    std_comment = row.get("student_comment", "").strip()

                    def to_float(val, default=0.0):
                        try:
                            return float(val)
                        except:
                            return default

                    part = to_float(row.get("participation"), 55.0)
                    in_time = to_float(row.get("in_time"), 15.0)
                    t1_inst = to_float(row.get("task1_inst"))
                    t1_llm = to_float(row.get("task1_llm"))
                    t2_inst = to_float(row.get("task2_inst"))
                    t2_llm = to_float(row.get("task2_llm"))
                    t3_inst = to_float(row.get("task3_inst"))
                    t3_llm = to_float(row.get("task3_llm"))
                    doc_inst = to_float(row.get("docs_inst"))
                    doc_llm = to_float(row.get("docs_llm"))
                    b_inst = to_float(row.get("bonus_inst"))
                    b_llm = to_float(row.get("bonus_llm"))

                    code_files = get_code_files(row_batch, assign_folder, roll)
                    audit_data = get_evaluation_audit(row_batch, assign_folder, roll)
                    remarks = audit_data["remarks"]

                    if roll not in students_map:
                        students_map[roll] = {
                            "id": roll,
                            "roll": roll,
                            "batch": row_batch,
                            "assignments": []
                        }

                    students_map[roll]["assignments"].append({
                        "assignmentId": assign_id,
                        "status": status,
                        "submissionTime": sub_time,
                        "onTime": True,
                        "driveLink": drive_link,
                        "instructorTransparencyNote": inst_note,
                        "studentComment": std_comment,
                        "auditReport": audit_data["report"],
                        "scores": {
                            "participation": {
                                "max": 55,
                                "inst": part,
                                "llm": part,
                                "note": remarks.get("participation", "Participation credit"),
                                "llmReasoning": remarks.get("participation", "Full credit for submitted attempt.")
                            },
                            "inTime": {
                                "max": 15,
                                "inst": in_time,
                                "llm": in_time,
                                "note": remarks.get("inTime", "Submission timing"),
                                "llmReasoning": remarks.get("inTime", "Submitted before deadline.")
                            },
                            "task1": {
                                "max": 25,
                                "inst": t1_inst,
                                "llm": t1_llm,
                                "note": remarks.get("task1", f"Inst: {t1_inst}, LLM: {t1_llm}"),
                                "llmReasoning": remarks.get("task1", "Non-blocking concurrency evaluation.")
                            },
                            "task2": {
                                "max": 25,
                                "inst": t2_inst,
                                "llm": t2_llm,
                                "note": remarks.get("task2", f"Inst: {t2_inst}, LLM: {t2_llm}"),
                                "llmReasoning": remarks.get("task2", "Software PWM timing and integer overflow audit.")
                            },
                            "task3": {
                                "max": 25,
                                "inst": t3_inst,
                                "llm": t3_llm,
                                "note": remarks.get("task3", f"Inst: {t3_inst}, LLM: {t3_llm}"),
                                "llmReasoning": remarks.get("task3", "Hardware-accelerated sonar reader evaluation.")
                            },
                            "documentation": {
                                "max": 5,
                                "inst": doc_inst,
                                "llm": doc_llm,
                                "note": remarks.get("documentation", f"Inst: {doc_inst}, LLM: {doc_llm}"),
                                "llmReasoning": remarks.get("documentation", "Clarity and inline comments evaluation.")
                            },
                            "bonus": {
                                "max": 75,
                                "inst": b_inst,
                                "llm": b_llm,
                                "note": remarks.get("bonus", f"Inst: {b_inst}, LLM: {b_llm}"),
                                "llmReasoning": remarks.get("bonus", "Bonus pool evaluation.")
                            }
                        },
                        "codeFiles": code_files
                    })

    out_data = {
        "system": {
            "name": "HACK Elo Rating Board",
            "org": "Hardware Acceleration Club of KUET",
            "llmModel": "Gemini 3.8 Flash (Medium Thinking)",
            "hybridFormula": "Task/Bonus Final = (Instructor * 0.6) + (LLM * 0.4)"
        },
        "batches": batches,
        "assignments": assignments_meta,
        "students": list(students_map.values())
    }

    js_content = f"// AUTO-GENERATED BY generate_data.py FROM data/ CSVs AND submissions/ CODE\n// DO NOT EDIT MANUALLY - EDIT data/<batch>/*.csv AND RE-RUN: python3 generate_data.py\n\nconst HACK_DATA = {json.dumps(out_data, indent=2)};\n"

    with open(OUTPUT_FILE, "w", encoding="utf-8") as fp:
        fp.write(js_content)

    print(f"Successfully generated {OUTPUT_FILE} from CSV sources ({len(students_map)} students processed).")

    # Automatically compile Pug templates to HTML pages
    build_script = os.path.join(REPO_ROOT, "build_templates.js")
    if os.path.exists(build_script):
        print("Compiling Pug templates...")
        res = subprocess.run(["node", build_script], capture_output=True, text=True)
        print(res.stdout.strip())
        if res.returncode != 0:
            print("Pug compilation error:", res.stderr)

if __name__ == "__main__":
    main()
