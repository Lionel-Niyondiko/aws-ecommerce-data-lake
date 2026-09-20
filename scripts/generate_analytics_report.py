#!/usr/bin/env python3
"""Build a deterministic Markdown/JSON/CSV report from Athena result JSON files."""
from __future__ import annotations

import csv
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

QUERY_META = {
    "q1_total": ("Q1", "Chiffre d'affaires total sur les trois derniers mois", 1),
    "q1_pays": ("Q1", "Chiffre d'affaires par pays", 2),
    "q2_top_chiffre_affaires": ("Q2", "Top 10 produits par chiffre d'affaires", 1),
    "q2_top_quantite": ("Q2", "Top 10 produits par quantite vendue", 2),
    "q2_comparaison": ("Q2", "Comparaison des Top 10 produits", 3),
    "q3_mensuel": ("Q3", "Evolution mensuelle du chiffre d'affaires et des commandes", 1),
    "q3_controle": ("Q3", "Controle de coherence du comptage des commandes", 2),
    "q4_panier_par_pays": ("Q4", "Panier moyen par pays", 1),
    "q5_top_clients": ("Q5", "Top 5 clients par chiffre d'affaires cumule", 1),
    "q6_population_orpheline": ("Q6", "Cles orphelines, volume et impact", 1),
    "q6_impact_cles_orphelines": ("Q6", "Impact financier des cles orphelines", 2),
    "q6_evolution_orphelins": ("Q6", "Evolution mensuelle des cles orphelines", 3),
}


def load_result(path: Path) -> tuple[list[str], list[list[str]]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload.get("ResultSet", {}).get("Rows", [])
    if not rows:
        return [], []
    headers = [x.get("VarCharValue", "") for x in rows[0].get("Data", [])]
    data = []
    for row in rows[1:]:
        values = [x.get("VarCharValue", "") for x in row.get("Data", [])]
        values += [""] * (len(headers) - len(values))
        data.append(values[: len(headers)])
    return headers, data


def table(headers: list[str], rows: list[list[str]]) -> str:
    if not headers:
        return "_Aucun résultat._\n"
    safe = lambda value: str(value).replace("|", "\\|").replace("\n", " ")
    out = ["| " + " | ".join(map(safe, headers)) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    out.extend("| " + " | ".join(map(safe, row)) + " |" for row in rows)
    return "\n".join(out) + "\n"


def as_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def col(headers: list[str], rows: list[list[str]], name: str) -> list[str]:
    try:
        i = headers.index(name)
    except ValueError:
        return []
    return [r[i] if i < len(r) else "" for r in rows]


def first_row(headers: list[str], rows: list[list[str]]) -> dict[str, str]:
    return dict(zip(headers, rows[0])) if rows else {}


def make_summary(results: dict[str, tuple[list[str], list[list[str]]]]) -> list[str]:
    lines: list[str] = []

    q1 = first_row(*results.get("q1_total", ([], [])))
    if q1:
        ca = q1.get("chiffre_affaires_net", "")
        commandes = q1.get("nombre_commandes", "")
        lines.append(f"- **Q1 :** chiffre d'affaires net de **{ca}** pour **{commandes} commandes** sur les trois derniers mois.")
    h, r = results.get("q1_pays", ([], []))
    if r and "pays" in h:
        top = dict(zip(h, r[0]))
        lines.append(f"  - Le pays en tête du chiffre d'affaires est **{top.get('pays', '')}**, avec **{top.get('chiffre_affaires', '')}** ({top.get('part_chiffre_affaires_pct', '')} %).")

    h, r = results.get("q2_top_chiffre_affaires", ([], []))
    if r:
        top = dict(zip(h, r[0]))
        lines.append(f"- **Q2 :** le produit en tête par chiffre d'affaires est **{top.get('produit', '')}**, avec **{top.get('chiffre_affaires', '')}**.")
    h, r = results.get("q2_top_quantite", ([], []))
    if r:
        top = dict(zip(h, r[0]))
        lines.append(f"  - Le produit en tête par quantité vendue est **{top.get('produit', '')}**, avec **{top.get('quantite_vendue', '')}** unités.")
    h, r = results.get("q2_comparaison", ([], []))
    if r and "statut_top_10" in h:
        i = h.index("statut_top_10")
        both = sum(1 for row in r if len(row) > i and row[i] == "Dans les deux Top 10")
        lines.append(f"  - Le tableau de comparaison identifie **{both} produits** présents dans les deux Top 10.")

    h, r = results.get("q3_mensuel", ([], []))
    if r and "chiffre_affaires" in h:
        i_ca = h.index("chiffre_affaires")
        valid = [(as_float(row[i_ca]), row) for row in r if len(row) > i_ca and as_float(row[i_ca]) is not None]
        if valid:
            top = max(valid, key=lambda x: x[0])[1]
            label = " ".join(str(top[h.index(k)]) for k in ("nom_mois", "annee") if k in h and h.index(k) < len(top))
            lines.append(f"- **Q3 :** le chiffre d'affaires mensuel maximal est observé en **{label.strip()}**, à **{top[i_ca]}**.")

    h, r = results.get("q4_panier_par_pays", ([], []))
    if r and "panier_moyen" in h:
        i = h.index("panier_moyen")
        valid = [(as_float(row[i]), row) for row in r if len(row) > i and as_float(row[i]) is not None]
        if valid:
            top = max(valid, key=lambda x: x[0])[1]
            lines.append(f"- **Q4 :** le panier moyen le plus élevé est celui du pays **{top[0]}**, à **{top[i]}**.")

    h, r = results.get("q5_top_clients", ([], []))
    if r:
        top = dict(zip(h, r[0]))
        lines.append(f"- **Q5 :** le premier client du classement cumulé est **{top.get('client', '')}**, avec **{top.get('chiffre_affaires', '')}** de chiffre d'affaires.")

    h, r = results.get("q6_population_orpheline", ([], []))
    if r and "population" in h:
        i_pop = h.index("population")
        i_rows = h.index("nombre_lignes") if "nombre_lignes" in h else None
        i_ca = h.index("chiffre_affaires") if "chiffre_affaires" in h else None
        i_pct = h.index("part_chiffre_affaires_pct") if "part_chiffre_affaires_pct" in h else None
        orphan = [row for row in r if len(row) > i_pop and row[i_pop] != "Cles completes"]
        if orphan and i_rows is not None and i_ca is not None:
            total_rows = sum(int(row[i_rows]) for row in orphan if row[i_rows].isdigit())
            revenue = sum(as_float(row[i_ca]) or 0 for row in orphan)
            lines.append(f"- **Q6 :** les populations à clés orphelines représentent **{total_rows} lignes** et environ **{revenue:.2f}** de chiffre d'affaires cumulé.")
    h, r = results.get("q6_impact_cles_orphelines", ([], []))
    if r:
        impact = first_row(h, r)
        lines.append(f"  - Le filtrage des clés orphelines ferait perdre **{impact.get('lignes_perdues', '')} lignes** et **{impact.get('chiffre_affaires_perdu', '')}** de chiffre d'affaires.")

    return lines


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: generate_analytics_report.py <report_directory>", file=sys.stderr)
        return 2

    report_dir = Path(sys.argv[1]).resolve()
    report_dir.mkdir(parents=True, exist_ok=True)

    results: dict[str, tuple[list[str], list[list[str]]]] = {}
    files = sorted((report_dir / "raw").glob("*.json"))
    for path in files:
        if path.name in {"report.json"}:
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        if "ResultSet" not in payload:
            continue
        name = path.stem
        results[name] = load_result(path)

    generated_at = datetime.now().astimezone().isoformat(timespec="seconds")
    questions: dict[str, list[dict[str, Any]]] = {f"Q{i}": [] for i in range(1, 7)}
    for name, (headers, rows) in results.items():
        q, title, order = QUERY_META.get(name, ("Annexe", name, 99))
        questions.setdefault(q, []).append({
            "id": name,
            "titre": title,
            "ordre": order,
            "colonnes": headers,
            "lignes": rows,
        })
    for entries in questions.values():
        entries.sort(key=lambda x: x["ordre"])

    report_json = {
        "genere_le": generated_at,
        "questions": questions,
    }
    (report_dir / "report.json").write_text(json.dumps(report_json, ensure_ascii=False, indent=2), encoding="utf-8")

    # Long CSV, convenient for spreadsheet/pivot use.
    with (report_dir / "report.csv").open("w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.writer(fh)
        writer.writerow(["question", "requete", "ligne", "colonne", "valeur"])
        for name, (headers, rows) in results.items():
            q = QUERY_META.get(name, ("Annexe", name, 99))[0]
            for row_num, row in enumerate(rows, start=1):
                for header, value in zip(headers, row):
                    writer.writerow([q, name, row_num, header, value])

    md: list[str] = [
        "# Rapport analytique e-commerce",
        "",
        f"**Genere le :** {generated_at}",
        "",
        "## Synthese factuelle",
        "",
    ]
    md.extend(make_summary(results))
    md.append("")

    for qnum in ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"]:
        md.extend([f"## {qnum}", ""])
        for entry in questions[qnum]:
            md.extend([f"### {entry['titre']}", "", table(entry["colonnes"], entry["lignes"]), ""])

    (report_dir / "report.md").write_text("\n".join(md), encoding="utf-8")
    print(report_dir / "report.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
