"""Validate AI Unlocked course archives and produce private bundles."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import os
import zipfile

ROOT = Path(__file__).resolve().parents[1]
COURSES = {
    "C01": {"price": 0, "question_counts": [5] + [10] * 9},
    "C02": {"price": 3900, "question_counts": [10] * 10},
}

def normalize(source, assessment_id, expected_pass):
    threshold = source.get("pass_percentage", source.get("passing_score"))
    if threshold != expected_pass or threshold != 80:
        raise ValueError(f"Unexpected threshold for {assessment_id}")
    questions = []
    for number, item in enumerate(source["questions"], 1):
        options = item["options"]
        correct = item["correct_index"]
        if (len(options) < 2 or not all(isinstance(option, str) and option.strip() for option in options)
                or len(set(options)) != len(options) or type(correct) is not int
                or not 0 <= correct < len(options) or not item["question"].strip()):
            raise ValueError(f"Invalid question {assessment_id}/{number}")
        questions.append({**item, "sourceId": item.get("id"), "id": f"{assessment_id}-{number}"})
    return {"id": assessment_id, "passPercentage": threshold, "questions": questions}

def import_course(archive_path):
    with zipfile.ZipFile(archive_path) as archive:
        def content(name):
            return archive.read(name).decode("utf-8")
        def parse(name):
            return json.loads(content(name))
        def pdf(name):
            data = archive.read(name)
            if not data.startswith(b"%PDF-"):
                raise ValueError(f"{name} is not a PDF")
            return base64.b64encode(data).decode("ascii")
        manifest = parse("course-manifest.json")
        course_id = manifest["id"]
        config = COURSES.get(course_id)
        if not config or (manifest["price_cents"], manifest["currency"], manifest["pass_percentage"]) != (config["price"], "CAD", 80):
            raise ValueError("Unexpected course manifest")
        if course_id == "C02" and manifest.get("publication_status") != "draft":
            raise ValueError("Course 02 must be imported as a draft")
        lessons = []
        assessments = {}
        for number, lesson in enumerate(manifest["lessons"], 1):
            expected_id = f"{course_id[1:]}.{number:02}"
            if lesson["id"] != expected_id or lesson["preview"] != (number == 1):
                raise ValueError(f"Unexpected lesson {lesson['id']}")
            markdown = content(lesson["content"])
            assessments[expected_id] = normalize(parse(lesson["assessment"]), expected_id, lesson["pass_percentage"])
            lessons.append({"id": expected_id, "title": lesson["title"], "markdown": markdown})
        assessments["final"] = normalize(parse(manifest["final_exam"]), "final", manifest["pass_percentage"])
        if len(lessons) != 10 or len(assessments["final"]["questions"]) != 50:
            raise ValueError("Expected ten lessons and a 50-question exam")
        if [len(assessments[lesson["id"]]["questions"]) for lesson in lessons] != config["question_counts"]:
            raise ValueError("Unexpected lesson question counts")
        bundle = {
            "title": manifest["title"], "manifest": manifest, "lessons": lessons,
            "assessments": assessments, "syllabus": content("Syllabus.md"),
            "rubric": content(manifest.get("capstone_rubric", "Capstone-rubric.md")),
            "workbookMarkdown": content("Workbook.md"),
            "workbookPdf": pdf(manifest.get("workbook", "Workbook.pdf")),
        }
        if course_id == "C02":
            bundle.update(
                promptLibraryMarkdown=content("Prompt-library.md"),
                promptLibraryPdf=pdf(manifest["prompt_library"]),
                certificateTemplateMarkdown=content("Certificate-template.md"),
                certificateTemplatePdf=pdf(manifest["certificate_template"]),
            )
        payload = json.dumps(bundle, ensure_ascii=False, sort_keys=True)
        return {**bundle, "version": hashlib.sha256(payload.encode()).hexdigest()[:16]}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    bundle = import_course(args.archive)
    course_id = bundle["manifest"]["id"]
    default = ROOT / ".local-data" / "ai-unlocked" / f"course-{course_id[1:]}.json"
    output = (args.output or default).resolve()
    if output.is_relative_to(ROOT) and not output.is_relative_to(ROOT / ".local-data"):
        parser.error("Private course bundles must stay outside the repository or in ignored .local-data/")
    if output.exists() and json.loads(output.read_text(encoding="utf-8"))["manifest"]["id"] != course_id:
        parser.error("Refusing to replace a private bundle for a different course")
    output.parent.mkdir(parents=True, exist_ok=True)
    with os.fdopen(os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as stream:
        os.fchmod(stream.fileno(), 0o600)
        json.dump(bundle, stream, ensure_ascii=False)
    print(f"Imported {course_id}: {len(bundle['lessons'])} lessons and {sum(len(item['questions']) for item in bundle['assessments'].values())} questions. Version {bundle['version']}.")
