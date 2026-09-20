#!/usr/bin/env python3
"""Build deterministic HTML/Markdown/JSON/CSV reports from Athena result JSON files."""
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


def html_escape(value: Any) -> str:
    import html
    return html.escape(str(value), quote=True)


def html_table(headers: list[str], rows: list[list[str]]) -> str:
    if not headers:
        return '<p class="empty">Aucun résultat.</p>'
    head = "".join(f"<th>{html_escape(h)}</th>" for h in headers)
    body = []
    for row in rows:
        cells = "".join(f"<td>{html_escape(v)}</td>" for v in row)
        body.append(f"<tr>{cells}</tr>")
    return '<div class="table-wrap"><table><thead><tr>' + head + '</tr></thead><tbody>' + ''.join(body) + '</tbody></table></div>'


def make_html(generated_at: str, questions: dict[str, list[dict[str, Any]]], summary: list[str]) -> str:
    import html

    summary_html = []
    for line in summary:
        text = html.escape(line).replace("**", "")
        if text.startswith("- "):
            text = text[2:]
        summary_html.append(f"<li>{text}</li>")

    sections = []
    for qnum in ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"]:
        entries = questions.get(qnum, [])
        blocks = []
        for entry in entries:
            blocks.append(
                f'<article class="query">'
                f'<div class="query-title"><span class="query-id">{html_escape(entry["id"])}</span>'
                f'<h3>{html_escape(entry["titre"])}</h3></div>'
                f'{html_table(entry["colonnes"], entry["lignes"])}'
                f'</article>'
            )
        content = ''.join(blocks) if blocks else '<p class="empty">Aucun résultat.</p>'
        sections.append(
            f'<section id="{qnum.lower()}"><div class="section-head">'
            f'<span class="section-number">{qnum}</span><h2>Question métier {qnum[1:]}</h2>'
            f'</div>{content}</section>'
        )

    return f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport analytique e-commerce</title>
<style>
:root {{ --ink:#1d1d1b; --muted:#6b6963; --line:#dedbd3; --paper:#f7f6f2; --panel:#fff; --accent:#ee4b23; --soft:#f0eee8; }}
* {{ box-sizing:border-box; }}
html {{ scroll-behavior:smooth; }}
body {{ margin:0; background:var(--paper); color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; line-height:1.55; }}
main {{ max-width:1180px; margin:0 auto; padding:56px 28px 90px; }}
header {{ border-bottom:1px solid var(--line); padding-bottom:34px; margin-bottom:34px; }}
.eyebrow {{ font:600 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }}
h1 {{ margin:12px 0 8px; font-size:clamp(34px,5vw,58px); line-height:1.02; letter-spacing:-.04em; font-weight:700; }}
.subtitle {{ max-width:720px; color:var(--muted); font-size:17px; }}
.meta {{ margin-top:18px; color:var(--muted); font-size:13px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }}
.summary {{ background:var(--panel); border:1px solid var(--line); padding:24px 26px; margin-bottom:46px; }}
.summary h2 {{ margin:0 0 14px; font-size:19px; }}
.summary ul {{ margin:0; padding-left:20px; }}
.summary li {{ margin:8px 0; }}
section {{ margin:0 0 54px; scroll-margin-top:24px; }}
.section-head {{ display:flex; align-items:baseline; gap:14px; border-bottom:2px solid var(--ink); padding-bottom:10px; margin-bottom:20px; }}
.section-number {{ font:700 12px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--accent); }}
h2 {{ margin:0; font-size:28px; letter-spacing:-.025em; }}
.query {{ background:var(--panel); border:1px solid var(--line); margin:0 0 18px; overflow:hidden; }}
.query-title {{ display:flex; gap:12px; align-items:center; padding:18px 20px; border-bottom:1px solid var(--line); background:var(--soft); }}
.query-title h3 {{ margin:0; font-size:16px; font-weight:650; }}
.query-id {{ font:600 11px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--accent); }}
.table-wrap {{ overflow:auto; }}
table {{ width:100%; border-collapse:collapse; font-size:13px; min-width:640px; }}
th,td {{ padding:10px 12px; text-align:left; border-bottom:1px solid var(--line); vertical-align:top; white-space:nowrap; }}
th {{ background:#fbfaf7; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); position:sticky; top:0; }}
tr:last-child td {{ border-bottom:0; }}
.empty {{ padding:20px; color:var(--muted); }}
footer {{ border-top:1px solid var(--line); padding-top:18px; color:var(--muted); font-size:12px; }}
@media (max-width:700px) {{ main {{ padding:34px 16px 60px; }} .summary {{ padding:18px; }} h2 {{ font-size:23px; }} }}
</style>
</head>
<body>
<main>
<header>
  <div class="eyebrow">AWS E-commerce Data Lake · Analytics</div>
  <h1>Rapport analytique e-commerce</h1>
  <div class="subtitle">Restitution des six questions métier exécutées dans Amazon Athena. Les tableaux ci-dessous proviennent directement des résultats des requêtes.</div>
  <div class="meta">Généré le {html_escape(generated_at)}</div>
</header>
<div class="summary"><h2>Synthèse factuelle</h2><ul>{''.join(summary_html) if summary_html else '<li>Aucune synthèse disponible.</li>'}</ul></div>
{''.join(sections)}
<footer>Source : <code>sql/05_analytics.sql</code> · Résultats Athena archivés avec cette exécution.</footer>
</main>
</body>
</html>
'''

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
    (report_dir / "report.html").write_text(make_html(generated_at, questions, make_summary(results)), encoding="utf-8")
    print(report_dir / "report.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
