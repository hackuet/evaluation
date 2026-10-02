#!/usr/bin/env python3
"""
HACK Data Generator
Auto-generates data.js from CSV grading sheets in data/ and submission code files.
Usage: python3 generate_data.py
"""

import os
import csv
import json
import glob

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(REPO_ROOT, "data.js")

VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv"}

def get_code_files(batch, assignment_name, roll):
    """Scan submissions directory for text/code files (ignoring videos)."""
    # Look under e.g. 2k25/assignment-1/submissions/<roll>/
    sub_dir = os.path.join(REPO_ROOT, batch, assignment_name, "submissions", roll)
    if not os.path.exists(sub_dir):
        return []
    
    code_files = []
    for root, _, files in os.walk(sub_dir):
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext in VIDEO_EXTS:
                continue  # Never include videos
            fpath = os.path.join(root, f)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()
                code_files.append({
                    "name": f,
                    "content": content
                })
            except Exception as e:
                print(f"Warning: could not read {fpath}: {e}")
    return code_files

def main():
    batches = [
        {"id": "2k25", "name": "Batch 2k25", "active": True}
    ]

    assignments_meta = [
        {
            "id": "a1",
            "folder": "assignment-1",
            "code": "A-01",
            "batch": "2k25",
            "title": "Assignment 1: Dual LED, Software PWM & Sonar",
            "status": "Active",
            "deadline": "2026-10-01 23:59",
            "baseMax": 150,
            "bonusMax": 75,
            "totalMax": 225,
            "rubric": {
                "participation": {"max": 55, "name": "Participation"},
                "inTime": {"max": 15, "name": "In-Time (5m grace)"},
                "task1": {"max": 25, "name": "Task 1: Dual LED Blinker"},
                "task2": {"max": 25, "name": "Task 2: Software PWM"},
                "task3": {"max": 25, "name": "Task 3: Sonar Reader (HW Accel)"},
                "documentation": {"max": 5, "name": "Inline Comments"},
                "bonus": {"max": 75, "name": "Bonus Pool (i.b.1–iii.b)"}
            }
        }
    ]

    for meta in assignments_meta:
        q_path = os.path.join(REPO_ROOT, meta["batch"], meta["folder"], "QUESTION.md")
        if os.path.exists(q_path):
            with open(q_path, "r", encoding="utf-8") as fp:
                meta["question"] = fp.read().strip()

    students_map = {}

    # Read CSV files in 2k25/*/*.csv (merging data directly with assignment folder)
    csv_pattern = os.path.join(REPO_ROOT, "2k25", "*", "*.csv")
    for csv_path in sorted(glob.glob(csv_pattern)):
        basename = os.path.basename(csv_path)
        if basename == "template.csv":
            continue

        parts = csv_path.split(os.sep)
        batch = "2k25"
        assign_folder = parts[-2]
        assign_name = assign_folder
        assign_id = "a1" if "1" in assign_name else assign_name

        with open(csv_path, "r", encoding="utf-8") as fp:
            reader = csv.DictReader(fp)
            for row in reader:
                roll = row.get("roll", "").strip()
                if not roll:
                    continue

                batch = row.get("batch", "2k25").strip() or "2k25"
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

                code_files = get_code_files(batch, assign_name, roll)

                if roll not in students_map:
                    students_map[roll] = {
                        "id": roll,
                        "roll": roll,
                        "batch": batch,
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
                    "scores": {
                        "participation": {"max": 55, "inst": part, "llm": part, "note": "Participation credit"},
                        "inTime": {"max": 15, "inst": in_time, "llm": in_time, "note": "Submission timing"},
                        "task1": {"max": 25, "inst": t1_inst, "llm": t1_llm, "note": f"Inst: {t1_inst}, LLM: {t1_llm}"},
                        "task2": {"max": 25, "inst": t2_inst, "llm": t2_llm, "note": f"Inst: {t2_inst}, LLM: {t2_llm}"},
                        "task3": {"max": 25, "inst": t3_inst, "llm": t3_llm, "note": f"Inst: {t3_inst}, LLM: {t3_llm}"},
                        "documentation": {"max": 5, "inst": doc_inst, "llm": doc_llm, "note": f"Inst: {doc_inst}, LLM: {doc_llm}"},
                        "bonus": {"max": 75, "inst": b_inst, "llm": b_llm, "note": f"Inst: {b_inst}, LLM: {b_llm}"}
                    },
                    "codeFiles": code_files
                })

    out_data = {
        "system": {
            "name": "HACK Elo Rating Board",
            "org": "Hardware Acceleration Club of KUET",
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

if __name__ == "__main__":
    main()
