import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GENERATOR = ROOT / "scripts" / "generate_analytics_report.py"


def write_athena_result(path: Path, headers: list[str], rows: list[list[str]]) -> None:
    payload = {
        "ResultSet": {
            "Rows": [
                {"Data": [{"VarCharValue": value} for value in headers]},
                *[
                    {"Data": [{"VarCharValue": value} for value in row]}
                    for row in rows
                ],
            ]
        }
    }
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_generator_reads_results_from_raw_directory(tmp_path):
    report_dir = tmp_path / "analytics_run"
    raw = report_dir / "raw"
    raw.mkdir(parents=True)

    write_athena_result(
        raw / "q1_total.json",
        ["chiffre_affaires_net", "nombre_commandes"],
        [["125430.50", "842"]],
    )
    write_athena_result(
        raw / "q1_pays.json",
        ["pays", "chiffre_affaires", "part_chiffre_affaires_pct"],
        [["France", "42000.00", "33.48"], ["Germany", "38000.00", "30.30"]],
    )

    subprocess.run(
        [sys.executable, str(GENERATOR), str(report_dir)],
        check=True,
        capture_output=True,
        text=True,
    )

    report_md = (report_dir / "report.md").read_text(encoding="utf-8")
    report_json = json.loads((report_dir / "report.json").read_text(encoding="utf-8"))
    report_csv = (report_dir / "report.csv").read_text(encoding="utf-8-sig")

    assert "125430.50" in report_md
    assert "France" in report_md
    assert "## Q1" in report_md
    assert report_json["questions"]["Q1"]
    assert any(item["id"] == "q1_total" for item in report_json["questions"]["Q1"])
    assert "q1_total" in report_csv


def test_generator_ignores_non_athena_json_at_report_root(tmp_path):
    report_dir = tmp_path / "analytics_run"
    raw = report_dir / "raw"
    raw.mkdir(parents=True)

    (report_dir / "unrelated.json").write_text(
        json.dumps({"not": "an Athena result"}), encoding="utf-8"
    )
    write_athena_result(
        raw / "q5_top_clients.json",
        ["client", "chiffre_affaires"],
        [["Client A", "25000.00"]],
    )

    subprocess.run(
        [sys.executable, str(GENERATOR), str(report_dir)],
        check=True,
        capture_output=True,
        text=True,
    )

    report_md = (report_dir / "report.md").read_text(encoding="utf-8")
    assert "Client A" in report_md
    assert "unrelated" not in report_md
