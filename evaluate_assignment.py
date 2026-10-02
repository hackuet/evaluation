#!/usr/bin/env python3
"""
HACK Generic Assignment Evaluation & Commenting Engine
------------------------------------------------------
A generic CLI tool to mark each segment, record per-segment technical comments,
and record overall comments across any batch and assignment using pregenerated files.

Supports:
- Dynamic discovery of batches, assignments, and rubric segments ($N$ tasks + $M$ bonuses)
- Ingesting pregenerated submission files (submissions/<roll>/*)
- Ingesting pregenerated markdown evaluation reports (evaluations/<roll>.md)
- Extracting & computing hybrid marks: Final = (Instructor * 0.6) + (LLM * 0.4)
- Recording comments for every segment and overall summary comments
- Synchronizing with the assignment CSV and triggering data.js / Pug compilation

Usage:
  python3 evaluate_assignment.py --batch 2k25 --assignment assignment-1 --inspect 52509028
  python3 evaluate_assignment.py --batch 2k25 --assignment assignment-1 --sync-csv
  python3 evaluate_assignment.py --batch 2k25 --assignment assignment-1 --generate-reports
  python3 evaluate_assignment.py --batch 2k25 --assignment assignment-1 --recompile
"""

import os
import re
import csv
import json
import glob
import argparse
import subprocess
from typing import Dict, List, Any, Optional

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_HYBRID_INST_WEIGHT = 0.6
DEFAULT_HYBRID_LLM_WEIGHT = 0.4

def discover_batches() -> List[str]:
    """Scan repo root for batch directories (e.g. 2k24, 2k25, 2k26)."""
    batches = []
    for item in os.listdir(REPO_ROOT):
        p = os.path.join(REPO_ROOT, item)
        if os.path.isdir(p) and re.match(r"^\d+k\d+$", item):
            batches.append(item)
    batches.sort(reverse=True)
    return batches or ["2k25"]

def discover_assignments(batch: str) -> List[str]:
    """Scan batch folder for assignment directories."""
    batch_dir = os.path.join(REPO_ROOT, batch)
    if not os.path.isdir(batch_dir):
        return []
    assigns = []
    for item in sorted(os.listdir(batch_dir)):
        p = os.path.join(batch_dir, item)
        if os.path.isdir(p) and ("assignment" in item.lower() or item.startswith("a")):
            assigns.append(item)
    return assigns or ["assignment-1"]

def parse_rubric(batch: str, assignment: str) -> Dict[str, Any]:
    """
    Dynamically discover segments and their max marks from meta.json, RUBRIC.md,
    or fallback to standard embedded rubric schema.
    """
    assign_dir = os.path.join(REPO_ROOT, batch, assignment)
    meta_path = os.path.join(assign_dir, "meta.json")
    rubric_path = os.path.join(assign_dir, "RUBRIC.md")

    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as fp:
                meta = json.load(fp)
                if "rubric" in meta:
                    return meta["rubric"]
        except Exception as e:
            print(f"Warning reading {meta_path}: {e}")

    segments = {
        "participation": {"name": "Participation (Commitment)", "max": 55, "type": "base"},
        "inTime": {"name": "In-Time Submission", "max": 15, "type": "base"},
        "task1": {"name": "Task 1", "max": 25, "type": "task"},
        "task2": {"name": "Task 2", "max": 25, "type": "task"},
        "task3": {"name": "Task 3", "max": 25, "type": "task"},
        "documentation": {"name": "Inline Code Comments & Clarity", "max": 5, "type": "docs"},
        "bonus_ib1": {"name": "Bonus i.b.1 (Generic N-LEDs)", "max": 10, "type": "bonus"},
        "bonus_ib2": {"name": "Bonus i.b.2 (Hardware Port Opt.)", "max": 15, "type": "bonus"},
        "bonus_ib3": {"name": "Bonus i.b.3 (Multitasking Systems)", "max": 10, "type": "bonus"},
        "bonus_iib1": {"name": "Bonus ii.b.1 (HW PWM Acceleration)", "max": 15, "type": "bonus"},
        "bonus_iib2": {"name": "Bonus ii.b.2 (Custom PWM Servo)", "max": 10, "type": "bonus"},
        "bonus_iiib": {"name": "Bonus iii.b (Smart Dustbin Sim)", "max": 15, "type": "bonus"},
    }

    if os.path.exists(rubric_path):
        try:
            with open(rubric_path, "r", encoding="utf-8") as fp:
                content = fp.read()
            # If RUBRIC.md mentions custom tasks or points, extract them
            m_tasks = re.findall(r"(?:Task\s*(\d+)|\b(Task\s*[\w\d]+))\s*[:\-]\s*(.*?)(?:\((\d+)\s*(?:Marks|pts)\))", content, re.I)
            for m in m_tasks:
                tnum = m[0] or m[1]
                tnum_clean = re.sub(r"[^\d]", "", tnum)
                if tnum_clean:
                    key = f"task{tnum_clean}"
                    segments[key] = {
                        "name": f"Task {tnum_clean}: {m[2].strip()}",
                        "max": float(m[3]),
                        "type": "task"
                    }
        except Exception as e:
            print(f"Warning reading {rubric_path}: {e}")

    return segments

def get_submission_files(batch: str, assignment: str, roll: str) -> List[str]:
    """List pregenerated submitted files for a student (excluding video binaries)."""
    sub_dir = os.path.join(REPO_ROOT, batch, assignment, "submissions", roll)
    if not os.path.isdir(sub_dir):
        return []
    files = []
    for root, _, fnames in os.walk(sub_dir):
        for f in sorted(fnames):
            ext = os.path.splitext(f)[1].lower()
            if ext in {".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv"}:
                continue
            rel = os.path.relpath(os.path.join(root, f), sub_dir)
            files.append(rel)
    return files

def parse_evaluation_markdown(md_path: str) -> Dict[str, Any]:
    """
    Parse a pregenerated evaluation report (<roll>.md).
    Extracts:
    - Metadata (roll, timestamp, on-time status)
    - Each segment's max, instructor mark, LLM mark, combined mark, and segment comment / remark
    - Detailed technical analysis per task
    - Overall comments (Strengths, Recommended Next Steps, overall summary)
    """
    if not os.path.exists(md_path):
        return {}

    with open(md_path, "r", encoding="utf-8", errors="ignore") as fp:
        content = fp.read()

    data = {
        "roll": "",
        "submission_time": "",
        "on_time": True,
        "segments": {},
        "overall_comment": {
            "strengths": [],
            "next_steps": [],
            "summary": ""
        },
        "raw_content": content
    }

    # Extract roll
    m_roll = re.search(r"-\s*\*\*Student Roll\*\*:\s*`?(\d+)`?", content)
    if m_roll:
        data["roll"] = m_roll.group(1)

    # Extract timestamp
    m_time = re.search(r"-\s*\*\*Submission Timestamp\*\*:\s*([^\n\r]+)", content)
    if m_time:
        data["submission_time"] = m_time.group(1).strip()

    # Extract On-Time status
    m_ontime = re.search(r"-\s*\*\*On-Time Status\*\*:\s*([^\n\r]+)", content)
    if m_ontime:
        data["on_time"] = "on-time" in m_ontime.group(1).lower()

    # Parse Score Summary Table
    in_table = False
    for line in content.splitlines():
        line_clean = line.strip()
        if not line_clean.startswith("|"):
            continue
        if "---" in line_clean:
            in_table = True
            continue
        if not in_table:
            continue

        parts = [p.strip() for p in line_clean.split("|")[1:-1]]
        if len(parts) >= 6:
            component = parts[1]
            comp_lower = component.lower()
            max_val = _parse_float(parts[2])
            inst_val = _parse_float(parts[3])
            llm_val = _parse_float(parts[4])
            combined_val = _parse_float(parts[5])
            remark = parts[-1] if len(parts) >= 7 else parts[5]

            # Ignore subtotal and total rows
            if any(term in comp_lower for term in ["subtotal", "total score", "total", "mandatory components"]):
                continue

            seg_key = _map_component_to_key(comp_lower)
            if seg_key:
                data["segments"][seg_key] = {
                    "name": component.replace("**", "").strip(),
                    "max": max_val,
                    "inst_mark": inst_val,
                    "llm_mark": llm_val,
                    "combined_mark": combined_val,
                    "comment": remark
                }

    # Extract Strengths & Recommended Next Steps (Overall Comment)
    strengths_section = re.search(r"### Strengths\s*\n([\s\S]*?)(?=### Recommended Next Steps|## 5|$)", content, re.I)
    if strengths_section:
        items = re.findall(r"^\d+\.\s*\*\*(.*?)\*\*:\s*([^\n]+)", strengths_section.group(1), re.M)
        for title, desc in items:
            data["overall_comment"]["strengths"].append(f"{title}: {desc.strip()}")

    next_steps_section = re.search(r"### Recommended Next Steps.*?\n([\s\S]*?)(?=##|$)", content, re.I)
    if next_steps_section:
        items = re.findall(r"^\d+\.\s*\*\*(.*?)\*\*:\s*([^\n]+)", next_steps_section.group(1), re.M)
        for title, desc in items:
            data["overall_comment"]["next_steps"].append(f"{title}: {desc.strip()}")

    # Summary note
    if not data["overall_comment"]["strengths"] and not data["overall_comment"]["next_steps"]:
        sec4 = re.search(r"## 4\.\s*([^\n]+)\s*\n([\s\S]*?)(?=##|$)", content)
        if sec4:
            data["overall_comment"]["summary"] = sec4.group(2).strip()

    return data

def _map_component_to_key(component: str) -> Optional[str]:
    """Map table component text to normalized segment key."""
    if "participation" in component:
        return "participation"
    if "in-time" in component or "time" in component:
        return "inTime"
    if "task 1" in component or "task1" in component:
        return "task1"
    if "task 2" in component or "task2" in component:
        return "task2"
    if "task 3" in component or "task3" in component:
        return "task3"
    if "task 4" in component or "task4" in component:
        return "task4"
    if "comment" in component or "documentation" in component or "clarity" in component:
        return "documentation"
    if "i.b.1" in component:
        return "bonus_ib1"
    if "i.b.2" in component:
        return "bonus_ib2"
    if "i.b.3" in component:
        return "bonus_ib3"
    if "ii.b.1" in component:
        return "bonus_iib1"
    if "ii.b.2" in component:
        return "bonus_iib2"
    if "iii.b" in component:
        return "bonus_iiib"
    if "bonus" in component and "subtotal" not in component:
        return "bonus"
    return None

def _parse_float(val: str, default: float = 0.0) -> float:
    """Strip markdown formatting and symbols and convert to float."""
    clean = re.sub(r"[^\d.]", "", val)
    try:
        return float(clean)
    except:
        return default

def calculate_hybrid_mark(inst: float, llm: float, inst_weight: float = DEFAULT_HYBRID_INST_WEIGHT, llm_weight: float = DEFAULT_HYBRID_LLM_WEIGHT) -> float:
    """Compute hybrid final score combining human instructor and LLM audit marks."""
    return round((inst * inst_weight) + (llm * llm_weight), 2)

def inspect_student(batch: str, assignment: str, roll: str) -> None:
    """Print an executive segment-by-segment report card in terminal."""
    assign_dir = os.path.join(REPO_ROOT, batch, assignment)
    md_path = os.path.join(assign_dir, "evaluations", f"{roll}.md")
    
    if not os.path.exists(md_path):
        print(f"[-] No evaluation report found at {md_path}")
        return

    data = parse_evaluation_markdown(md_path)
    sub_files = get_submission_files(batch, assignment, roll)

    print("\n" + "="*80)
    print(f" HACK TECHNICAL EVALUATION REPORT CARD: ROLL {roll} (Batch {batch})")
    print(f" Assignment: {assignment.upper()} | Timestamp: {data.get('submission_time', 'N/A')}")
    print(f" Submission Files ({len(sub_files)}): {', '.join(sub_files) if sub_files else 'None'}")
    print("="*80)

    print(f"\n{'SEGMENT / COMPONENT':<32} {'MAX':<6} {'INST':<8} {'LLM':<8} {'FINAL':<8} {'COMMENT / REMARK'}")
    print("-" * 80)

    total_max = 0.0
    total_inst = 0.0
    total_llm = 0.0
    total_final = 0.0

    for seg_key, s in data.get("segments", {}).items():
        name = s["name"][:30]
        max_m = s["max"]
        inst_m = s["inst_mark"]
        llm_m = s["llm_mark"]
        fin_m = s["combined_mark"]
        comment = s["comment"]

        total_max += max_m
        total_inst += inst_m
        total_llm += llm_m
        total_final += fin_m

        print(f"{name:<32} {max_m:<6.1f} {inst_m:<8.2f} {llm_m:<8.2f} {fin_m:<8.2f} {comment}")

    print("-" * 80)
    print(f"{'TOTAL COMBINED SCORE':<32} {total_max:<6.1f} {total_inst:<8.2f} {total_llm:<8.2f} {total_final:<8.2f}")
    pct = (total_final / total_max * 100) if total_max > 0 else 0
    print(f"{'PERCENTAGE':<32} {pct:.1f}%")
    print("=" * 80)

    print("\n[OVERALL TECHNICAL COMMENT & FEEDBACK]")
    strengths = data.get("overall_comment", {}).get("strengths", [])
    if strengths:
        print("  Key Strengths:")
        for st in strengths:
            print(f"    + {st}")
    
    next_steps = data.get("overall_comment", {}).get("next_steps", [])
    if next_steps:
        print("  Recommended Next Steps:")
        for ns in next_steps:
            print(f"    - {ns}")

    summary = data.get("overall_comment", {}).get("summary", "")
    if summary:
        print(f"  Summary:\n    {summary}")
    print("\n")

def sync_csv_from_evaluations(batch: str, assignment: str) -> None:
    """
    Read pregenerated evaluation markdown files and synchronize marks & instructor notes
    into the assignment CSV sheet.
    """
    assign_dir = os.path.join(REPO_ROOT, batch, assignment)
    csv_files = glob.glob(os.path.join(assign_dir, "*.csv"))
    csv_path = next((f for f in csv_files if "template" not in os.path.basename(f)), None)

    if not csv_path:
        csv_path = os.path.join(assign_dir, f"{assignment}.csv")
        print(f"[*] Target CSV not found, using default: {csv_path}")

    eval_dir = os.path.join(assign_dir, "evaluations")
    if not os.path.isdir(eval_dir):
        print(f"[-] Evaluation directory not found: {eval_dir}")
        return

    existing_rows = []
    fieldnames = []
    if os.path.exists(csv_path):
        with open(csv_path, "r", encoding="utf-8") as fp:
            reader = csv.DictReader(fp)
            fieldnames = reader.fieldnames or []
            existing_rows = list(reader)

    if not fieldnames:
        fieldnames = [
            "roll", "batch", "status", "submission_time", "on_time", "drive_link",
            "participation", "in_time",
            "task1_inst", "task1_llm", "task2_inst", "task2_llm", "task3_inst", "task3_llm",
            "docs_inst", "docs_llm", "bonus_inst", "bonus_llm",
            "instructor_note", "student_comment"
        ]

    rows_by_roll = {r.get("roll", "").strip(): r for r in existing_rows if r.get("roll")}

    updated_count = 0
    for md_file in sorted(glob.glob(os.path.join(eval_dir, "*.md"))):
        roll = os.path.splitext(os.path.basename(md_file))[0]
        data = parse_evaluation_markdown(md_file)
        if not data:
            continue

        segs = data.get("segments", {})
        row = rows_by_roll.get(roll, {
            "roll": roll,
            "batch": batch,
            "status": "Evaluated",
            "submission_time": data.get("submission_time", ""),
            "on_time": "Yes" if data.get("on_time") else "No",
            "drive_link": "",
            "participation": 55,
            "in_time": 15,
            "instructor_note": "",
            "student_comment": ""
        })

        if "participation" in segs:
            row["participation"] = segs["participation"]["inst_mark"]
        if "inTime" in segs:
            row["in_time"] = segs["inTime"]["inst_mark"]
        if "task1" in segs:
            row["task1_inst"] = segs["task1"]["inst_mark"]
            row["task1_llm"] = segs["task1"]["llm_mark"]
        if "task2" in segs:
            row["task2_inst"] = segs["task2"]["inst_mark"]
            row["task2_llm"] = segs["task2"]["llm_mark"]
        if "task3" in segs:
            row["task3_inst"] = segs["task3"]["inst_mark"]
            row["task3_llm"] = segs["task3"]["llm_mark"]
        if "documentation" in segs:
            row["docs_inst"] = segs["documentation"]["inst_mark"]
            row["docs_llm"] = segs["documentation"]["llm_mark"]

        bonus_inst = sum(s["inst_mark"] for k, s in segs.items() if k.startswith("bonus"))
        bonus_llm = sum(s["llm_mark"] for k, s in segs.items() if k.startswith("bonus"))
        row["bonus_inst"] = bonus_inst
        row["bonus_llm"] = bonus_llm

        rows_by_roll[roll] = row
        updated_count += 1

    with open(csv_path, "w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows_by_roll.values():
            writer.writerow(r)

    print(f"[+] Successfully synchronized {updated_count} student evaluation records into {csv_path}")

def recompile_all() -> None:
    """Run generate_data.py to rebuild data.js and recompile Pug templates."""
    print("[*] Recompiling HACK data store and Pug static pages...")
    res = subprocess.run(["python3", "generate_data.py"], cwd=REPO_ROOT, capture_output=True, text=True)
    print(res.stdout)
    if res.returncode != 0:
        print("[!] Error recompiling:", res.stderr)

def main():
    parser = argparse.ArgumentParser(description="HACK Generic Assignment Evaluation & Commenting Engine")
    parser.add_argument("--batch", default="2k25", help="Batch folder (default: 2k25)")
    parser.add_argument("--assignment", default="assignment-1", help="Assignment folder (default: assignment-1)")
    parser.add_argument("--roll", help="Specific student roll to inspect or grade")
    parser.add_argument("--inspect", nargs="?", const="all", help="Print segment scorecard and overall comments for a roll (or all)")
    parser.add_argument("--sync-csv", action="store_true", help="Synchronize marks from pregenerated evaluations into CSV")
    parser.add_argument("--json", action="store_true", help="Output parsed data as JSON")
    parser.add_argument("--recompile", action="store_true", help="Trigger generate_data.py and Pug page recompilation")
    
    args = parser.parse_args()

    if args.inspect:
        target_roll = args.roll or (args.inspect if args.inspect != "all" else None)
        if target_roll:
            inspect_student(args.batch, args.assignment, target_roll)
        else:
            eval_dir = os.path.join(REPO_ROOT, args.batch, args.assignment, "evaluations")
            for md in sorted(glob.glob(os.path.join(eval_dir, "*.md"))):
                r = os.path.splitext(os.path.basename(md))[0]
                inspect_student(args.batch, args.assignment, r)

    if args.sync_csv:
        sync_csv_from_evaluations(args.batch, args.assignment)

    if args.recompile:
        recompile_all()

    if not args.inspect and not args.sync_csv and not args.recompile:
        print(f"[*] Running HACK Evaluation Engine on Batch: {args.batch}, Assignment: {args.assignment}")
        sync_csv_from_evaluations(args.batch, args.assignment)
        if args.roll:
            inspect_student(args.batch, args.assignment, args.roll)
        else:
            print("[+] Synchronization complete. Use --inspect <roll> to view a scorecard.")

if __name__ == "__main__":
    main()
