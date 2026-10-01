"""HTML presentation layer for the analytics report.

Presentation only. Everything here reads the Athena results already loaded by
generate_analytics_report.py and formats or draws them. No query, metric or
business rule is defined in this file: a value either comes straight from a
result row, or is picked from the result rows with the same selection rule
the Markdown summary uses (first row, max of a column, row count).

The page is one self-contained file: inline CSS, inline SVG charts, a few
lines of JS for the active navigation link, and the Geist fonts embedded from
docs/fonts when they are available. It needs no network access.
"""

from __future__ import annotations

import base64
import html
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "docs" / "fonts"

Result = tuple[list[str], list[list[str]]]
Results = dict[str, Result]

NNBSP = " "  # narrow no-break space, French thousands separator
NBSP = " "
MINUS = "−"

MONTHS_FR = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
]
MONTHS_FR_SHORT = [
    "janv.",
    "févr.",
    "mars",
    "avr.",
    "mai",
    "juin",
    "juil.",
    "août",
    "sept.",
    "oct.",
    "nov.",
    "déc.",
]

# Display labels for result columns. The raw column name stays available as a
# tooltip on every header, so the table can still be traced back to the SQL.
COLUMN_LABELS = {
    "chiffre_affaires_net": "CA net",
    "chiffre_affaires_brut": "CA brut",
    "impact_retours": "Impact des retours",
    "chiffre_affaires": "Chiffre d'affaires",
    "chiffre_affaires_perdu": "CA perdu",
    "part_chiffre_affaires_pct": "Part du CA",
    "part_lignes_pct": "Part des lignes",
    "part_orpheline_pct": "Part orpheline",
    "nombre_lignes": "Lignes",
    "nombre_lignes_orphelines": "Lignes orphelines",
    "nombre_commandes": "Commandes",
    "nombre_factures_brutes": "Factures",
    "nombre_articles_moyen": "Articles par commande",
    "lignes_perdues": "Lignes perdues",
    "pays": "Pays",
    "produit_id": "ID",
    "produit": "Produit",
    "categorie": "Catégorie",
    "quantite_vendue": "Quantité",
    "prix_unitaire_moyen": "Prix unitaire moyen",
    "rang_chiffre_affaires": "Rang CA",
    "rang_quantite": "Rang quantité",
    "statut_top_10": "Statut",
    "annee": "Année",
    "mois": "N°",
    "nom_mois": "Mois",
    "panier_moyen": "Panier moyen",
    "panier_median": "Panier médian",
    "total_commandes_mensuelles": "Commandes, somme des mois",
    "total_commandes_reel": "Commandes, total réel",
    "total_factures_mensuelles": "Factures, somme des mois",
    "total_factures_reel": "Factures, total réel",
    "client_id": "ID",
    "client": "Client",
    "courriel": "Courriel",
    "ville": "Ville",
    "entreprise": "Entreprise",
    "population": "Population",
}

ID_COLUMNS = {"produit_id", "client_id", "annee", "mois"}
MONEY_COLUMNS = {
    "chiffre_affaires",
    "chiffre_affaires_net",
    "chiffre_affaires_brut",
    "chiffre_affaires_perdu",
    "impact_retours",
    "panier_moyen",
    "panier_median",
    "prix_unitaire_moyen",
}


# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------


def esc(value: Any) -> str:
    return html.escape(str(value), quote=True)


def num(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _group(x: float, decimals: int) -> str:
    text = f"{abs(x):,.{decimals}f}".replace(",", NNBSP).replace(".", ",")
    return (MINUS if x < 0 else "") + text


def fmt_int(value: Any) -> str:
    x = num(value)
    return _group(x, 0) if x is not None else str(value)


def fmt_dec(value: Any, decimals: int = 2) -> str:
    x = num(value)
    return _group(x, decimals) if x is not None else str(value)


def fmt_money(value: Any, decimals: int = 2) -> str:
    x = num(value)
    return f"{_group(x, decimals)}{NBSP}$" if x is not None else str(value)


def fmt_money_compact(value: Any) -> str:
    x = num(value)
    if x is None:
        return str(value)
    if abs(x) >= 1_000_000:
        return f"{_group(x / 1_000_000, 2)}{NBSP}M$"
    if abs(x) >= 1_000:
        return f"{_group(x / 1_000, 1)}{NBSP}k$"
    return fmt_money(x, 0)


def fmt_axis_money(x: float) -> str:
    """Axis ticks: as short as the step allows (0, 1 M$, 1,5 M$, 500 k$)."""
    if x == 0:
        return "0"
    if abs(x) >= 1_000_000:
        v = x / 1_000_000
        return f"{_group(v, 0 if v.is_integer() else 1)}{NBSP}M$"
    v = x / 1_000
    return f"{_group(v, 0 if v.is_integer() else 1)}{NBSP}k$"


def fmt_pct(value: Any) -> str:
    x = num(value)
    return f"{_group(x, 2)}{NBSP}%" if x is not None else str(value)


def fmt_cell(column: str, value: str) -> str:
    if value == "" or column in ID_COLUMNS:
        return value
    if column.endswith("_pct"):
        return fmt_pct(value)
    if column in MONEY_COLUMNS:
        return fmt_money(value)
    x = num(value)
    if x is None:
        return value
    if x.is_integer() and "." not in value:
        return fmt_int(value)
    return fmt_dec(value)


def is_numeric_column(column: str, rows: list[list[str]], index: int) -> bool:
    if column in ID_COLUMNS:
        return False
    values = [r[index] for r in rows if index < len(r) and r[index] != ""]
    return bool(values) and all(num(v) is not None for v in values)


def month_label(row: dict[str, str], short: bool = False) -> str:
    m = num(row.get("mois"))
    year = row.get("annee", "")
    if m is None or not 1 <= int(m) <= 12:
        return f"{row.get('nom_mois', '')} {year}".strip()
    names = MONTHS_FR_SHORT if short else MONTHS_FR
    return f"{names[int(m) - 1]} {year}".strip()


def format_timestamp(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso)
    except ValueError:
        return iso
    offset = dt.strftime("%z")
    tz = f" (UTC{offset[:3]}:{offset[3:]})" if offset else ""
    return f"{dt.day} {MONTHS_FR[dt.month - 1]} {dt.year}, {dt:%H:%M}{tz}"


def records(result: Result | None) -> list[dict[str, str]]:
    if not result:
        return []
    headers, rows = result
    return [dict(zip(headers, row, strict=False)) for row in rows]


# ---------------------------------------------------------------------------
# Building blocks
# ---------------------------------------------------------------------------


def data_table(headers: list[str], rows: list[list[str]], wide: bool = False) -> str:
    if not headers:
        return empty_state("Cette requête n'a renvoyé aucune colonne.")
    numeric = [is_numeric_column(h, rows, i) for i, h in enumerate(headers)]
    head = "".join(
        f'<th scope="col" title="{esc(h)}"{" class=num" if numeric[i] else ""}>'
        f"{esc(COLUMN_LABELS.get(h, h))}</th>"
        for i, h in enumerate(headers)
    )
    body = []
    for row in rows:
        cells = []
        for i, h in enumerate(headers):
            value = row[i] if i < len(row) else ""
            cls = "num" if numeric[i] else ("id" if h in ID_COLUMNS else "")
            attr = f' class="{cls}"' if cls else ""
            cells.append(f"<td{attr}>{esc(fmt_cell(h, value))}</td>")
        body.append("<tr>" + "".join(cells) + "</tr>")
    if not rows:
        body.append(f'<tr><td colspan="{len(headers)}" class="empty-row">Aucune ligne.</td></tr>')
    cls = "table-wrap wide" if wide else "table-wrap"
    return (
        f'<div class="{cls}" tabindex="0"><table><thead><tr>{head}</tr></thead>'
        f"<tbody>{''.join(body)}</tbody></table></div>"
    )


def disclosure(name: str, result: Result | None, label: str = "Données") -> str:
    if not result:
        return ""
    headers, rows = result
    n = len(rows)
    lines = f"{n} ligne" + ("s" if n > 1 else "")
    return (
        f'<details class="data"><summary><span>{esc(label)}</span>'
        f'<code>{esc(name)}</code><span class="count">{lines}</span></summary>'
        f"{data_table(headers, rows)}</details>"
    )


def empty_state(text: str) -> str:
    return (
        f'<div class="empty"><p>{esc(text)}</p>'
        "<p>Relancez <code>task analytics</code> pour régénérer les résultats.</p></div>"
    )


def section_head(qid: str, title: str, lede: str = "") -> str:
    lede_html = f'<p class="lede">{lede}</p>' if lede else ""
    return (
        f'<header class="sec-head"><h2><span class="qid">{esc(qid)}</span>'
        f"{esc(title)}</h2>{lede_html}</header>"
    )


def source(*names: str) -> str:
    codes = ", ".join(f"<code>{esc(n)}</code>" for n in names)
    return f'<p class="source">Source{NBSP}: {codes}</p>'


def nice_step(max_value: float, target_ticks: int = 4) -> float:
    if max_value <= 0:
        return 1.0
    raw = max_value / target_ticks
    magnitude = 10 ** len(str(int(raw))) / 10
    for m in (1, 2, 2.5, 5, 10):
        if raw <= m * magnitude:
            return m * magnitude
    return 10 * magnitude


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------


def overview(results: Results) -> str:
    total = records(results.get("q1_total"))
    pops = records(results.get("q6_population_orpheline"))
    impact = records(results.get("q6_impact_cles_orphelines"))

    if not total:
        hero = empty_state("Le chiffre d'affaires total (q1_total) n'est pas disponible.")
        bridge = ""
    else:
        t = total[0]
        context = []
        if t.get("nombre_commandes"):
            context.append(f"{fmt_int(t['nombre_commandes'])} commandes")
        if t.get("nombre_lignes"):
            context.append(f"{fmt_int(t['nombre_lignes'])} lignes de vente")
        net = num(t.get("chiffre_affaires_net"))
        net_text = fmt_dec(t.get("chiffre_affaires_net", "")) if net is not None else "n/d"
        hero = (
            '<div class="kpi-hero">'
            '<p class="kpi-label">Chiffre d\'affaires net, trois derniers mois</p>'
            f'<p class="kpi-value">{esc(net_text)}<span class="unit">{NBSP}$</span></p>'
            f'<p class="kpi-context">{esc(", ".join(context))}</p>'
            "</div>"
        )
        gross, returns = num(t.get("chiffre_affaires_brut")), num(t.get("impact_retours"))
        if gross and returns is not None and net is not None:
            scale = max(gross, abs(returns), abs(net)) or 1
            rows = [
                ("CA brut", gross, "mark"),
                ("Retours", returns, "mark soft"),
                ("CA net", net, "mark strong"),
            ]
            bars = "".join(
                f'<div class="bridge-row"><span class="bridge-k">{k}</span>'
                f'<span class="bridge-bar"><i class="{cls}" style="width:{abs(v) / scale * 100:.2f}%"></i></span>'
                f'<span class="bridge-v">{esc(fmt_money(v))}</span></div>'
                for k, v, cls in rows
            )
            bridge = (
                '<div class="bridge" aria-label="Du chiffre d\'affaires brut au net">'
                f'<p class="block-title">Du brut au net</p>{bars}'
                f"{source('q1_total')}</div>"
            )
        else:
            bridge = ""

    orphan_rows = [p for p in pops if p.get("population") != "Cles completes"]
    if orphan_rows and impact:
        share = sum(num(p.get("part_chiffre_affaires_pct")) or 0 for p in orphan_rows)
        i = impact[0]
        risk = (
            '<a class="risk" href="#q6">'
            '<p class="block-title">Clés orphelines</p>'
            f'<p class="risk-value">{esc(fmt_pct(round(share, 2)))}</p>'
            f'<p class="risk-text">du chiffre d\'affaires repose sur des lignes dont le produit '
            f"ou le client manque au catalogue, soit {esc(fmt_money(i.get('chiffre_affaires_perdu')))} "
            f"sur {esc(fmt_int(i.get('lignes_perdues')))} lignes.</p>"
            "</a>"
        )
    else:
        risk = ""

    return (
        '<section id="synthese" class="overview" aria-label="Vue d\'ensemble">'
        f'<div class="overview-grid">{hero}{bridge}{risk}</div>'
        f"{findings(results)}</section>"
    )


def findings(results: Results) -> str:
    """The six headline facts, picked with the same rules as make_summary()."""
    items: list[tuple[str, str]] = []

    pays = records(results.get("q1_pays"))
    if pays:
        p = pays[0]
        items.append(
            (
                "q1",
                f"<b>{esc(p.get('pays', ''))}</b> mène le chiffre d'affaires avec "
                f"{esc(fmt_money(p.get('chiffre_affaires')))}, soit "
                f"{esc(fmt_pct(p.get('part_chiffre_affaires_pct')))} du total.",
            )
        )

    top_ca = records(results.get("q2_top_chiffre_affaires"))
    top_qty = records(results.get("q2_top_quantite"))
    comp = records(results.get("q2_comparaison"))
    if top_ca or top_qty:
        parts = []
        if top_ca:
            parts.append(
                f"<b>{esc(top_ca[0].get('produit', ''))}</b> est premier en chiffre d'affaires "
                f"({esc(fmt_money(top_ca[0].get('chiffre_affaires')))})"
            )
        if top_qty:
            parts.append(
                f"<b>{esc(top_qty[0].get('produit', ''))}</b> en quantité "
                f"({esc(fmt_int(top_qty[0].get('quantite_vendue')))} unités)"
            )
        text = ", ".join(parts) + "."
        both = sum(1 for c in comp if c.get("statut_top_10") == "Dans les deux Top 10")
        if comp:
            text += f" {both} produits figurent dans les deux Top 10."
        items.append(("q2", text))

    months = [m for m in records(results.get("q3_mensuel")) if num(m.get("chiffre_affaires"))]
    if months:
        peak = max(months, key=lambda m: num(m["chiffre_affaires"]) or 0)
        items.append(
            (
                "q3",
                f"Le mois le plus fort est <b>{esc(month_label(peak))}</b>, à "
                f"{esc(fmt_money(peak['chiffre_affaires']))}.",
            )
        )

    baskets = [b for b in records(results.get("q4_panier_par_pays")) if num(b.get("panier_moyen"))]
    if baskets:
        top = max(baskets, key=lambda b: num(b["panier_moyen"]) or 0)
        items.append(
            (
                "q4",
                f"Le panier moyen le plus élevé est en <b>{esc(top.get('pays', ''))}</b> : "
                f"{esc(fmt_money(top['panier_moyen']))}.",
            )
        )

    clients = records(results.get("q5_top_clients"))
    if clients:
        c = clients[0]
        items.append(
            (
                "q5",
                f"<b>{esc(c.get('client', ''))}</b> est le premier client, avec "
                f"{esc(fmt_money(c.get('chiffre_affaires')))} cumulés.",
            )
        )

    impact = records(results.get("q6_impact_cles_orphelines"))
    if impact:
        i = impact[0]
        items.append(
            (
                "q6",
                f"Filtrer les clés orphelines ferait perdre <b>{esc(fmt_int(i.get('lignes_perdues')))} lignes</b> "
                f"et {esc(fmt_money(i.get('chiffre_affaires_perdu')))} de chiffre d'affaires.",
            )
        )

    if not items:
        return ""
    lis = "".join(
        f'<li><a href="#{qid}"><span class="qid">{qid.upper()}</span><span>{text}</span></a></li>'
        for qid, text in items
    )
    return f'<div class="findings"><h2 class="block-h">À retenir</h2><ol>{lis}</ol></div>'


def section_q1(results: Results) -> str:
    rows = records(results.get("q1_pays"))
    head = section_head(
        "Q1",
        "Où se fait le chiffre d'affaires",
        "Répartition du chiffre d'affaires des trois derniers mois par pays de facturation.",
    )
    if not rows:
        return f'<section id="q1" class="sec">{head}{empty_state("Aucun résultat pour q1_pays.")}</section>'
    values = [num(r.get("chiffre_affaires")) or 0 for r in rows]
    vmax = max(values) or 1
    bars = []
    for i, (r, v) in enumerate(zip(rows, values, strict=False)):
        cls = "mark accent" if i == 0 else "mark"
        bars.append(
            f'<li title="{esc(r.get("pays", ""))} : {esc(fmt_money(v))}, '
            f'{esc(fmt_int(r.get("nombre_lignes")))} lignes">'
            f'<span class="bl-k">{esc(r.get("pays", ""))}</span>'
            f'<span class="bl-bar"><i class="{cls}" style="width:{v / vmax * 100:.2f}%"></i></span>'
            f'<span class="bl-v">{esc(fmt_money(v))}</span>'
            f'<span class="bl-p">{esc(fmt_pct(r.get("part_chiffre_affaires_pct")))}</span></li>'
        )
    first, last = rows[0], rows[-1]
    aside = (
        '<aside class="note">'
        '<p class="block-title">Écart entre pays</p>'
        f'<p class="note-figure">{esc(fmt_pct(last.get("part_chiffre_affaires_pct")))}'
        f"<span>à</span>{esc(fmt_pct(first.get('part_chiffre_affaires_pct')))}</p>"
        f"<p>Part du chiffre d'affaires, de {esc(last.get('pays', ''))} "
        f"à {esc(first.get('pays', ''))}, sur {len(rows)} pays.</p></aside>"
    )
    return (
        f'<section id="q1" class="sec">{head}'
        '<div class="split split-chart">'
        f'<div class="chart"><ol class="barlist">{"".join(bars)}</ol>{source("q1_pays")}</div>'
        f"{aside}</div>"
        f"{disclosure('q1_pays', results.get('q1_pays'))}</section>"
    )


def slopegraph(rows: list[dict[str, str]]) -> str:
    row_h, top = 30, 46
    x_dot_l, x_dot_r = 318, 462
    left_out = sorted(
        (r for r in rows if (num(r.get("rang_chiffre_affaires")) or 0) > 10),
        key=lambda r: num(r.get("rang_chiffre_affaires")) or 0,
    )
    right_out = sorted(
        (r for r in rows if (num(r.get("rang_quantite")) or 0) > 10),
        key=lambda r: num(r.get("rang_quantite")) or 0,
    )
    band_y = top + 10 * row_h + 4
    out_start = band_y + 26

    def y_for(rank: float, outsiders: list[dict[str, str]], r: dict[str, str]) -> float:
        if rank <= 10:
            return top + (rank - 1) * row_h
        return out_start + outsiders.index(r) * row_h

    n_out = max(len(left_out), len(right_out))
    height = (out_start + n_out * row_h + 8) if n_out else (top + 10 * row_h)
    parts = [
        f'<svg class="slope" viewBox="0 0 780 {height:.0f}" role="img" '
        'aria-labelledby="slope-t slope-d">'
        '<title id="slope-t">Rang en chiffre d\'affaires comparé au rang en quantité</title>'
        '<desc id="slope-d">Chaque ligne relie le rang d\'un produit dans le Top 10 du chiffre '
        "d'affaires à son rang dans le Top 10 des quantités vendues.</desc>",
        f'<text class="ax" x="{x_dot_l}" y="18" text-anchor="middle">Rang CA</text>',
        f'<text class="ax" x="{x_dot_r}" y="18" text-anchor="middle">Rang quantité</text>',
    ]
    if n_out:
        parts.append(
            f'<line class="band" x1="0" x2="780" y1="{band_y:.0f}" y2="{band_y:.0f}"/>'
            f'<text class="ax" x="0" y="{band_y + 16:.0f}">hors Top 10</text>'
        )
    for r in rows:
        rc, rq = num(r.get("rang_chiffre_affaires")) or 0, num(r.get("rang_quantite")) or 0
        yl, yr = y_for(rc, left_out, r), y_for(rq, right_out, r)
        both = r.get("statut_top_10") == "Dans les deux Top 10"
        cls = "p both" if both else "p only"
        name = esc(r.get("produit", ""))
        tip = (
            f"{r.get('produit', '')} ({r.get('categorie', '')}) : "
            f"{fmt_money(r.get('chiffre_affaires'))}, rang {fmt_int(rc)} en CA ; "
            f"{fmt_int(r.get('quantite_vendue'))} unités, rang {fmt_int(rq)} en quantité"
        )
        parts.append(
            f'<g class="{cls}" tabindex="0"><title>{esc(tip)}</title>'
            f'<line x1="{x_dot_l}" y1="{yl:.0f}" x2="{x_dot_r}" y2="{yr:.0f}"/>'
            f'<circle cx="{x_dot_l}" cy="{yl:.0f}" r="3.5"/>'
            f'<circle cx="{x_dot_r}" cy="{yr:.0f}" r="3.5"/>'
            f'<text class="rk" x="{x_dot_l - 14}" y="{yl + 4:.0f}" text-anchor="end">{fmt_int(rc)}</text>'
            f'<text class="nm" x="{x_dot_l - 44}" y="{yl + 4:.0f}" text-anchor="end">{name}</text>'
            f'<text class="rk" x="{x_dot_r + 14}" y="{yr + 4:.0f}">{fmt_int(rq)}</text>'
            f'<text class="nm" x="{x_dot_r + 44}" y="{yr + 4:.0f}">{name}</text>'
            "</g>"
        )
    parts.append("</svg>")
    return "".join(parts)


def section_q2(results: Results) -> str:
    comp = records(results.get("q2_comparaison"))
    both = sum(1 for c in comp if c.get("statut_top_10") == "Dans les deux Top 10")
    lede = (
        f"{both} produits figurent dans les deux Top 10. Les autres ne sont forts que sur un "
        "seul critère, le chiffre d'affaires ou le volume."
        if comp
        else "Top 10 des produits par chiffre d'affaires et par quantité vendue."
    )
    head = section_head("Q2", "Quels produits portent les ventes", lede)
    tables = (
        disclosure("q2_top_chiffre_affaires", results.get("q2_top_chiffre_affaires"), "Top 10 CA")
        + disclosure("q2_top_quantite", results.get("q2_top_quantite"), "Top 10 quantité")
        + disclosure("q2_comparaison", results.get("q2_comparaison"), "Comparaison")
    )
    if not comp:
        body = empty_state("La comparaison des Top 10 (q2_comparaison) n'est pas disponible.")
        return f'<section id="q2" class="sec">{head}{body}{tables}</section>'
    legend = (
        '<ul class="legend">'
        '<li><i class="sw-line"></i>Dans les deux Top 10</li>'
        '<li><i class="sw-line dashed"></i>Un seul classement</li>'
        "</ul>"
    )
    groups: dict[str, list[str]] = {}
    for c in comp:
        groups.setdefault(c.get("statut_top_10", ""), []).append(c.get("produit", ""))
    reading = "".join(
        f'<div class="group"><p class="group-k"><b>{len(names)}</b> {esc(status)}</p>'
        f'<p class="group-v">{esc(", ".join(names))}</p></div>'
        for status, names in groups.items()
    )
    return (
        f'<section id="q2" class="sec">{head}'
        '<div class="split split-slope">'
        f'<div class="chart chart-slope"><div class="scroll-x">{slopegraph(comp)}</div>'
        f'<div class="chart-foot">{legend}{source("q2_comparaison")}</div></div>'
        f'<aside class="groups"><p class="block-title">Par statut</p>{reading}</aside></div>'
        f'<div class="tables">{tables}</div></section>'
    )


def columns(
    labels: list[str],
    values: list[float],
    tips: list[str],
    fmt_value,
    fmt_tick,
    title: str,
    highlight: int | None = None,
    height: str = "260px",
) -> str:
    """Column chart in HTML/CSS, so its text keeps a real size at every width."""
    vmax = max(values) if values else 0
    step = nice_step(vmax or 1)
    ymax = step * (int((vmax or 1) / step) + 1)
    ticks = []
    t = 0.0
    while t <= ymax + 1e-9:
        ticks.append(
            f'<span class="tick" style="bottom:{t / ymax * 100:.2f}%"><b>{esc(fmt_tick(t))}</b></span>'
        )
        t += step
    cols = []
    for i, (label, v, tip) in enumerate(zip(labels, values, tips, strict=False)):
        cls = "mark accent" if i == highlight else "mark"
        cols.append(
            f'<div class="cc-col" title="{esc(tip)}">'
            f'<div class="cc-bar-area"><span class="cc-val" style="bottom:{v / ymax * 100:.2f}%">'
            f"{esc(fmt_value(v))}</span>"
            f'<i class="{cls}" style="height:{v / ymax * 100:.2f}%"></i></div>'
            f'<span class="cc-x">{esc(label)}</span></div>'
        )
    return (
        f'<div class="cc" role="img" aria-label="{esc(title)}" style="--cc-h:{height}">'
        f'<div class="cc-grid">{"".join(ticks)}</div>'
        f'<div class="cc-cols" style="grid-template-columns:repeat({len(values)},minmax(0,1fr))">'
        f"{''.join(cols)}</div></div>"
    )


def section_q3(results: Results) -> str:
    months = records(results.get("q3_mensuel"))
    head = section_head(
        "Q3",
        "Comment évoluent les ventes",
        "Chiffre d'affaires, commandes et panier moyen, mois par mois.",
    )
    if not months:
        return f'<section id="q3" class="sec">{head}{empty_state("Aucun résultat pour q3_mensuel.")}</section>'
    values = [num(m.get("chiffre_affaires")) or 0 for m in months]
    chart_html = columns(
        [month_label(m, short=True) for m in months],
        values,
        [
            f"{month_label(m)} : {fmt_money(v)}, {fmt_int(m.get('nombre_commandes'))} commandes"
            for m, v in zip(months, values, strict=False)
        ],
        fmt_money_compact,
        fmt_axis_money,
        "Chiffre d'affaires par mois",
        highlight=values.index(max(values)) if values else None,
    )
    chart = f'<div class="chart">{chart_html}{source("q3_mensuel")}</div>'

    ctrl = records(results.get("q3_controle"))
    if ctrl:
        c = ctrl[0]

        def check(label: str, monthly: str, real: str, note: str) -> str:
            same = num(c.get(monthly)) == num(c.get(real))
            state = "ok" if same else "warn"
            sign = "=" if same else "≠"
            verdict = "Additif" if same else "Non additif"
            return (
                f'<div class="check {state}"><p class="check-k">{label}</p>'
                f'<p class="check-eq"><span>{esc(fmt_int(c.get(monthly)))}</span>'
                f'<b aria-hidden="true">{sign}</b><span>{esc(fmt_int(c.get(real)))}</span></p>'
                f'<p class="check-legend"><span>somme des mois</span><span>total réel</span></p>'
                f'<p class="check-v">{verdict}. {note}</p></div>'
            )

        control = (
            '<aside class="control"><p class="block-title">Contrôle de comptage</p>'
            + check(
                "Commandes",
                "total_commandes_mensuelles",
                "total_commandes_reel",
                "Une commande, c'est un numéro de facture à une date.",
            )
            + check(
                "Factures",
                "total_factures_mensuelles",
                "total_factures_reel",
                "Un même numéro de facture revient sur plusieurs dates.",
            )
            + source("q3_controle")
            + "</aside>"
        )
    else:
        control = ""
    return (
        f'<section id="q3" class="sec">{head}'
        f'<div class="split split-trend">{chart}{control}</div>'
        f'<div class="table-block">{data_table(*results["q3_mensuel"])}</div></section>'
    )


def section_q4(results: Results) -> str:
    rows = [r for r in records(results.get("q4_panier_par_pays")) if num(r.get("panier_moyen"))]
    head_lede = "Panier moyen et panier médian par pays, triés par panier moyen."
    if rows and all(
        (num(r.get("panier_moyen")) or 0) > (num(r.get("panier_median")) or 0) for r in rows
    ):
        head_lede = (
            "Dans chaque pays, le panier moyen dépasse le médian : quelques grosses "
            "commandes tirent la moyenne vers le haut."
        )
    head = section_head("Q4", "Combien dépense une commande", head_lede)
    if not rows:
        return f'<section id="q4" class="sec">{head}{empty_state("Aucun résultat pour q4_panier_par_pays.")}</section>'
    lows = [num(r.get("panier_median")) or num(r["panier_moyen"]) or 0 for r in rows]
    highs = [num(r["panier_moyen"]) or 0 for r in rows]
    lo = int(min(lows) // 100 * 100)
    hi = int(-(-max(highs) // 100) * 100)
    span = (hi - lo) or 1

    def pos(v: float) -> str:
        return f"{(v - lo) / span * 100:.2f}%"

    ticks = "".join(
        f'<span style="left:{pos(t)}">{esc(fmt_money(t, 0))}</span>' for t in range(lo, hi + 1, 100)
    )
    top = max(range(len(rows)), key=lambda i: highs[i])
    lines = []
    for i, r in enumerate(rows):
        mean, med = highs[i], num(r.get("panier_median"))
        acc = " accent" if i == top else ""
        seg = (
            f'<i class="seg" style="left:{pos(med)};width:{(mean - med) / span * 100:.2f}%"></i>'
            f'<i class="dot med" style="left:{pos(med)}"></i>'
            if med is not None
            else ""
        )
        tip = f"{r.get('pays', '')} : panier moyen {fmt_money(mean)}" + (
            f", médian {fmt_money(med)}" if med is not None else ""
        )
        lines.append(
            f'<li title="{esc(tip)}"><span class="db-k">{esc(r.get("pays", ""))}</span>'
            f'<span class="db-plot">{seg}<i class="dot mean{acc}" style="left:{pos(mean)}"></i></span>'
            f'<span class="db-v"><b>{esc(fmt_money(mean))}</b>'
            f"<span>{esc(fmt_money(med)) if med is not None else ''}</span></span></li>"
        )
    legend = (
        '<ul class="legend"><li><i class="sw-dot"></i>Panier moyen</li>'
        '<li><i class="sw-dot hollow"></i>Panier médian</li></ul>'
    )
    return (
        f'<section id="q4" class="sec">{head}'
        '<div class="chart chart-dumbbell">'
        '<div class="db-head"><span></span><span class="db-axis">' + ticks + "</span>"
        '<span class="db-cols"><span>moyen</span><span>médian</span></span></div>'
        f'<ol class="dumbbell">{"".join(lines)}</ol>'
        f'<div class="chart-foot">{legend}{source("q4_panier_par_pays")}</div></div>'
        f"{disclosure('q4_panier_par_pays', results.get('q4_panier_par_pays'))}</section>"
    )


def section_q5(results: Results) -> str:
    clients = records(results.get("q5_top_clients"))
    head = section_head(
        "Q5",
        "Qui sont les premiers clients",
        "Les cinq clients au chiffre d'affaires cumulé le plus élevé.",
    )
    if not clients:
        return f'<section id="q5" class="sec">{head}{empty_state("Aucun résultat pour q5_top_clients.")}</section>'
    vmax = max(num(c.get("chiffre_affaires")) or 0 for c in clients) or 1
    rows = []
    for i, c in enumerate(clients, start=1):
        v = num(c.get("chiffre_affaires")) or 0
        acc = " accent" if i == 1 else ""
        rows.append(
            "<tr>"
            f'<td class="rank">{i}</td>'
            f'<td><span class="who">{esc(c.get("client", ""))}</span>'
            f'<span class="sub">{esc(c.get("entreprise", ""))}</span></td>'
            f'<td class="hide-md">{esc(c.get("ville", ""))}</td>'
            f'<td class="mono hide-lg">{esc(c.get("courriel", ""))}</td>'
            f'<td class="num ca"><span class="inline-bar"><i class="mark{acc}" '
            f'style="width:{v / vmax * 100:.2f}%"></i></span>{esc(fmt_money(v))}</td>'
            f'<td class="num">{esc(fmt_int(c.get("nombre_commandes")))}</td>'
            f'<td class="num hide-md">{esc(fmt_int(c.get("nombre_lignes")))}</td>'
            f'<td class="id hide-md">{esc(c.get("client_id", ""))}</td>'
            "</tr>"
        )
    table = (
        '<div class="table-wrap" tabindex="0"><table class="leader"><thead><tr>'
        '<th scope="col">#</th>'
        '<th scope="col" title="client, entreprise">Client</th>'
        '<th scope="col" class="hide-md" title="ville">Ville</th>'
        '<th scope="col" class="hide-lg" title="courriel">Courriel</th>'
        '<th scope="col" class="num" title="chiffre_affaires">Chiffre d\'affaires</th>'
        '<th scope="col" class="num" title="nombre_commandes">Commandes</th>'
        '<th scope="col" class="num hide-md" title="nombre_lignes">Lignes</th>'
        '<th scope="col" class="hide-md" title="client_id">ID</th>'
        f"</tr></thead><tbody>{''.join(rows)}</tbody></table></div>"
    )
    return (
        f'<section id="q5" class="sec">{head}{table}{source("q5_top_clients")}'
        f"{disclosure('q5_top_clients', results.get('q5_top_clients'))}</section>"
    )


def section_q6(results: Results) -> str:
    pops = records(results.get("q6_population_orpheline"))
    impact = records(results.get("q6_impact_cles_orphelines"))
    monthly = records(results.get("q6_evolution_orphelins"))
    head = section_head(
        "Q6",
        "Que pèsent les clés orphelines",
        "Lignes de vente dont le produit ou le client est absent du catalogue. Elles restent "
        "dans le modèle, rattachées à des clés de convention.",
    )
    if not (pops or impact or monthly):
        return (
            f'<section id="q6" class="sec">{head}{empty_state("Aucun résultat pour Q6.")}</section>'
        )

    stack = ""
    if pops:
        shades = ["seg-0", "seg-1", "seg-2", "seg-3"]
        segs, legend = [], []
        k = 0
        for p in pops:
            complete = p.get("population") == "Cles completes"
            cls = "seg-base" if complete else shades[min(k, 3)]
            if not complete:
                k += 1
            share = num(p.get("part_chiffre_affaires_pct")) or 0
            segs.append(
                f'<i class="{cls}" style="width:{share:.2f}%" '
                f'title="{esc(p.get("population", ""))} : {esc(fmt_pct(share))} du CA"></i>'
            )
            legend.append(
                f'<tr><th scope="row"><i class="sw {cls}"></i> {esc(p.get("population", ""))}</th>'
                f'<td class="num">{esc(fmt_int(p.get("nombre_lignes")))}</td>'
                f'<td class="num">{esc(fmt_pct(p.get("part_lignes_pct")))}</td>'
                f'<td class="num">{esc(fmt_int(p.get("quantite_vendue")))}</td>'
                f'<td class="num">{esc(fmt_money(p.get("chiffre_affaires")))}</td>'
                f'<td class="num strong">{esc(fmt_pct(share))}</td></tr>'
            )
        stack = (
            '<div class="stack-block"><p class="block-title">Part du chiffre d\'affaires par population</p>'
            f'<div class="stack" role="img" aria-label="Répartition du chiffre d\'affaires par population">'
            f"{''.join(segs)}</div>"
            '<div class="table-wrap" tabindex="0"><table class="pop"><thead><tr>'
            '<th scope="col" title="population">Population</th>'
            '<th scope="col" class="num" title="nombre_lignes">Lignes</th>'
            '<th scope="col" class="num" title="part_lignes_pct">Part des lignes</th>'
            '<th scope="col" class="num" title="quantite_vendue">Quantité</th>'
            '<th scope="col" class="num" title="chiffre_affaires">Chiffre d\'affaires</th>'
            '<th scope="col" class="num" title="part_chiffre_affaires_pct">Part du CA</th>'
            f"</tr></thead><tbody>{''.join(legend)}</tbody></table></div>"
            f"{source('q6_population_orpheline')}</div>"
        )

    loss = ""
    if impact:
        i = impact[0]
        loss = (
            '<aside class="loss"><p class="block-title">Si on les filtrait</p>'
            f'<p class="loss-value">{esc(fmt_money(i.get("chiffre_affaires_perdu")))}</p>'
            f'<p class="loss-text">de chiffre d\'affaires et <b>{esc(fmt_int(i.get("lignes_perdues")))} lignes</b> '
            "disparaîtraient du modèle, sans aucune erreur. C'est ce que produirait un INNER JOIN.</p>"
            f"{source('q6_impact_cles_orphelines')}</aside>"
        )

    trend = ""
    if monthly:
        trend = (
            '<div class="trend-block"><p class="block-title">Part des lignes orphelines, par mois</p>'
            + columns(
                [month_label(r, short=True) for r in monthly],
                [num(r.get("part_orpheline_pct")) or 0 for r in monthly],
                [
                    f"{month_label(r)} : {fmt_int(r.get('nombre_lignes_orphelines'))} lignes "
                    f"orphelines sur {fmt_int(r.get('nombre_lignes'))}, {fmt_pct(r.get('part_orpheline_pct'))}"
                    for r in monthly
                ],
                fmt_pct,
                lambda t: f"{_group(t, 0)}{NBSP}%",
                "Part des lignes orphelines par mois",
                height="170px",
            )
            + f"{source('q6_evolution_orphelins')}</div>"
        )

    return (
        f'<section id="q6" class="sec">{head}'
        f'<div class="split split-risk">{loss}{trend}</div>{stack}'
        + disclosure("q6_evolution_orphelins", results.get("q6_evolution_orphelins"))
        + "</section>"
    )


def appendix(questions: dict[str, list[dict[str, Any]]]) -> str:
    entries = questions.get("Annexe", [])
    if not entries:
        return ""
    blocks = "".join(
        f'<div class="table-block"><h3>{esc(e["titre"])}</h3>{data_table(e["colonnes"], e["lignes"])}</div>'
        for e in entries
    )
    return f'<section id="annexe" class="sec">{section_head("+", "Annexe")}{blocks}</section>'


# ---------------------------------------------------------------------------
# Page
# ---------------------------------------------------------------------------

NAV = [
    ("synthese", "Synthèse"),
    ("q1", "Pays"),
    ("q2", "Produits"),
    ("q3", "Tendance"),
    ("q4", "Panier"),
    ("q5", "Clients"),
    ("q6", "Clés orphelines"),
]


def font_faces() -> str:
    faces = []
    for family, file, style in (
        ("Geist", "geist.woff2", "normal"),
        ("Geist Mono", "geist-mono.woff2", "normal"),
    ):
        path = FONT_DIR / file
        if not path.is_file():
            continue
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        faces.append(
            f'@font-face{{font-family:"{family}";src:url(data:font/woff2;base64,{data}) '
            f'format("woff2");font-weight:100 900;font-style:{style};font-display:swap}}'
        )
    return "".join(faces)


def render_report(
    generated_at: str,
    questions: dict[str, list[dict[str, Any]]],
    summary: list[str],
    results: Results,
) -> str:
    stamp = format_timestamp(generated_at)
    nav = "".join(f'<a href="#{i}">{esc(label)}</a>' for i, label in NAV)
    body = (
        overview(results)
        + section_q1(results)
        + section_q2(results)
        + section_q3(results)
        + section_q4(results)
        + section_q5(results)
        + section_q6(results)
        + appendix(questions)
    )
    if not summary and not results:
        body = empty_state("Aucun résultat Athena n'a été trouvé dans raw/.")
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="description" content="Rapport analytique du data lake e-commerce : six questions métier calculées dans Amazon Athena.">
<title>Rapport analytique e-commerce</title>
<style>{font_faces()}{CSS}</style>
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="topbar">
  <div class="topbar-in">
    <p class="brand"><span>E-commerce Data Lake</span> Rapport analytique</p>
    <nav aria-label="Sections du rapport">{nav}</nav>
    <p class="stamp"><time datetime="{esc(generated_at)}">{esc(stamp)}</time></p>
  </div>
</header>
<main id="contenu">
  <div class="intro">
    <h1>Rapport analytique <span class="nw">e-commerce</span></h1>
    <p>Six questions métier calculées dans Amazon Athena sur le modèle en étoile du data lake.</p>
  </div>
  {body}
</main>
<footer class="foot"><div class="foot-in">
  <p>Requêtes&nbsp;: <code>sql/05_analytics.sql</code>. Les résultats Athena bruts sont archivés avec cette exécution dans <code>raw/</code>.</p>
  <p>Généré le <time datetime="{esc(generated_at)}">{esc(stamp)}</time>.</p>
</div></footer>
<script>{JS}</script>
</body>
</html>
"""


JS = """
(function () {
  var links = document.querySelectorAll('.topbar nav a');
  if (!('IntersectionObserver' in window) || !links.length) return;
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      var a = byId[e.target.id];
      if (a) {
        a.setAttribute('aria-current', 'true');
        if (a.scrollIntoView && a.parentNode.scrollWidth > a.parentNode.clientWidth) {
          a.parentNode.scrollLeft = a.offsetLeft - 16;
        }
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(byId).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) io.observe(el);
  });
})();
"""

CSS = """
/* Tokens: shared with the walkthrough (docs/style.css) so the report and the
   case study read as one product. One accent, one neutral family, one radius
   rule: 8px containers, 6px controls, 2px data marks. Hairlines, no shadows. */
:root{
  --font:"Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"Geist Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --bg:#f3f4f5;--surface:#fbfbfc;--ink:#111417;--ink-2:#353b42;--muted:#575e66;--faint:#656c74;
  --line:rgba(17,20,23,.1);--line-2:rgba(17,20,23,.18);
  --mark:#868e97;--mark-strong:#353b42;
  --accent:#e8621f;--accent-ink:#b1450d;--accent-wash:rgba(232,98,31,.08);
  --r-box:8px;--r-ctl:6px;--r-mark:2px;
  --s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;--s7:48px;--s8:64px;--s9:96px;
  --gutter:clamp(16px,4vw,40px);--wrap:1240px;--bar:56px;
  --ease:cubic-bezier(.16,1,.3,1);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#0d0f12;--surface:#14171c;--ink:#e8ebee;--ink-2:#c3c8ce;--muted:#9aa1a9;--faint:#8a919a;
  --line:rgba(232,235,238,.09);--line-2:rgba(232,235,238,.17);
  --mark:#6c747d;--mark-strong:#c3c8ce;
  --accent:#f27a3a;--accent-ink:#ff9a63;--accent-wash:rgba(242,122,58,.1);
}}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:calc(var(--bar) + 16px);-webkit-text-size-adjust:100%}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
body{margin:0;background:var(--bg);color:var(--ink);font:400 15px/1.55 var(--font);
  font-feature-settings:"ss01";-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
code{font-family:var(--mono);font-size:.86em}
b,strong{font-weight:600}
a{color:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
.skip{position:absolute;left:-9999px;top:8px;background:var(--ink);color:var(--bg);padding:8px 12px;border-radius:var(--r-ctl);z-index:20}
.skip:focus{left:16px}

/* Top bar: one line, 56px, the only sticky layer (z 10). */
.topbar{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--bg) 92%,transparent);
  backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid var(--line)}
.topbar-in{max-width:var(--wrap);margin:0 auto;padding:0 var(--gutter);height:var(--bar);
  display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:var(--s5)}
.brand{margin:0;font-weight:600;font-size:14px;white-space:nowrap;letter-spacing:-.01em}
.brand span{color:var(--muted);font-weight:400;margin-right:6px}
.topbar nav{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;justify-self:center;min-width:0;max-width:100%}
.topbar nav::-webkit-scrollbar{display:none}
.topbar nav a{white-space:nowrap;text-decoration:none;color:var(--muted);font-size:13.5px;
  padding:6px 10px;border-radius:var(--r-ctl);transition:color .2s var(--ease),background .2s var(--ease)}
.topbar nav a:hover{color:var(--ink);background:var(--line)}
.topbar nav a[aria-current]{color:var(--ink);box-shadow:inset 0 -2px 0 var(--accent);border-radius:0}
.stamp{margin:0;font:400 12px var(--mono);color:var(--faint);white-space:nowrap}

main{max-width:var(--wrap);margin:0 auto;padding:0 var(--gutter)}
.intro{padding:var(--s7) 0 var(--s5);max-width:70ch}
.intro h1{margin:0;font-size:clamp(1.75rem,1.3rem + 1.6vw,2.5rem);font-weight:600;letter-spacing:-.03em;line-height:1.1}
.nw{white-space:nowrap}
.intro p{margin:var(--s3) 0 0;color:var(--muted);font-size:16px;text-wrap:balance}

/* Shared text roles. block-title is the one small label style; it names a
   block, never sits above a section headline. */
.block-title{margin:0 0 var(--s3);font-size:13px;font-weight:500;color:var(--muted)}
.block-h{margin:0 0 var(--s4);font-size:18px;font-weight:600;letter-spacing:-.015em}
.source{margin:var(--s3) 0 0;font-size:12px;color:var(--faint)}
.source code{color:var(--muted)}
.qid{font:500 12px var(--mono);color:var(--accent-ink);margin-right:10px;vertical-align:.2em}
.mono{font-family:var(--mono);font-size:12.5px;color:var(--muted)}
.num,.kpi-value,.risk-value,.loss-value,.note-figure,.check-eq{font-variant-numeric:tabular-nums}

/* Executive overview: one featured figure, a bridge, a risk flag. Three
   different weights on purpose. */
.overview{padding-bottom:var(--s8)}
.overview-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr) minmax(0,.85fr);
  border-top:1px solid var(--line-2);border-bottom:1px solid var(--line)}
.overview-grid>*{padding:var(--s6) var(--s6) var(--s6) 0}
.overview-grid>*+*{padding-left:var(--s6);border-left:1px solid var(--line)}
.kpi-label{margin:0;font-size:14px;color:var(--muted)}
.kpi-value{margin:var(--s2) 0 var(--s2);font-size:clamp(2.6rem,1.6rem + 3.2vw,4.25rem);font-weight:600;
  letter-spacing:-.045em;line-height:1}
.kpi-value .unit{font-size:.5em;letter-spacing:0;color:var(--muted);font-weight:500}
.kpi-context{margin:0;color:var(--ink-2)}
.bridge-row{display:grid;grid-template-columns:4.5rem minmax(0,1fr) auto;gap:var(--s3);align-items:center;
  padding:7px 0;font-size:14px}
.bridge-k{color:var(--muted)}
.bridge-bar{height:10px;display:block}
.bridge-bar i{display:block;height:100%;border-radius:var(--r-mark)}
.bridge-v{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.mark{background:var(--mark);fill:var(--mark)}
.mark.strong{background:var(--mark-strong);fill:var(--mark-strong)}
.mark.soft{background:var(--mark);opacity:.55;min-width:3px}
.mark.accent{background:var(--accent);fill:var(--accent)}
.risk{display:block;text-decoration:none;position:relative;transition:background .2s var(--ease)}
.risk:hover{background:var(--accent-wash)}
.risk-value{margin:0;font-size:2.4rem;font-weight:600;letter-spacing:-.035em;line-height:1;color:var(--accent-ink)}
.risk-text{margin:var(--s3) 0 0;font-size:14px;color:var(--ink-2);max-width:34ch}

.findings{padding-top:var(--s7)}
.findings ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
  column-gap:var(--s7)}
.findings li{border-top:1px solid var(--line)}
.findings a{display:grid;grid-template-columns:2.25rem 1fr;gap:var(--s2);padding:var(--s4) 0;text-decoration:none;
  color:var(--ink-2);transition:color .2s var(--ease)}
.findings a:hover{color:var(--ink)}
.findings a:hover .qid{color:var(--accent)}
.findings b{color:var(--ink)}

/* Sections */
.sec{padding:var(--s8) 0;border-top:1px solid var(--line-2)}
.sec-head{margin-bottom:var(--s6);max-width:68ch}
.sec-head h2{margin:0;font-size:clamp(1.4rem,1.1rem + 1vw,1.9rem);font-weight:600;letter-spacing:-.025em;line-height:1.15}
.lede{margin:var(--s3) 0 0;color:var(--muted);font-size:15.5px;max-width:62ch;text-wrap:pretty}
.split{display:grid;gap:var(--s7);align-items:start}
.split-chart{grid-template-columns:minmax(0,2.1fr) minmax(0,1fr)}
.split-trend{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}
.split-risk{grid-template-columns:minmax(0,1fr) minmax(0,1fr);margin-bottom:var(--s7)}
.stack-block .table-wrap{max-width:none}
.chart{min-width:0}
.chart-foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:var(--s3);margin-top:var(--s4)}
.chart-foot .source{margin:0}

/* Q1 bar list */
.barlist{list-style:none;margin:0;padding:0}
.barlist li{display:grid;grid-template-columns:8.5rem minmax(0,1fr) 8.5rem 4.5rem;gap:var(--s3);align-items:center;
  padding:6px 0;font-size:14px;border-radius:var(--r-ctl)}
.barlist li:hover .bl-bar i{filter:brightness(.85)}
.bl-k{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bl-bar{height:14px;display:block}
.bl-bar i{display:block;height:100%;border-radius:var(--r-mark);transition:filter .2s var(--ease)}
.bl-v,.bl-p{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.bl-p{color:var(--muted)}
.note{border-left:2px solid var(--accent);padding:var(--s1) 0 var(--s1) var(--s5)}
.note p{margin:0;color:var(--ink-2);font-size:14.5px}
.note .block-title{margin-bottom:var(--s3)}
.note-figure{font-size:1.9rem!important;font-weight:600;letter-spacing:-.03em;color:var(--ink)!important;
  margin-bottom:var(--s3)!important;line-height:1.1}
.note-figure span{font-size:.5em;font-weight:400;color:var(--muted);margin:0 .5em;letter-spacing:0}

/* Q2 slopegraph */
.scroll-x{overflow-x:auto}
.slope{width:100%;height:auto;display:block;min-width:620px;font-family:var(--font)}
.slope .ax{font-size:12px;fill:var(--muted)}
.slope .band{stroke:var(--line-2);stroke-dasharray:2 4}
.slope .nm{font-size:13px;fill:var(--ink-2)}
.slope .rk{font:500 12px var(--mono);fill:var(--muted)}
.slope .p line{stroke-width:1.5;transition:stroke .2s var(--ease),stroke-width .2s var(--ease)}
.slope .both line{stroke:var(--mark-strong)}
.slope .both circle{fill:var(--mark-strong)}
.slope .only line{stroke:var(--mark);stroke-dasharray:4 4}
.slope .only circle{fill:var(--bg);stroke:var(--mark);stroke-width:1.5}
.slope .only .nm{fill:var(--muted)}
.slope .p{outline:none;cursor:default}
.slope .p:hover line,.slope .p:focus line{stroke:var(--accent);stroke-width:2.5}
.slope .p:hover circle,.slope .p:focus circle{fill:var(--accent);stroke:var(--accent)}
.slope .p:hover .nm,.slope .p:focus .nm{fill:var(--ink);font-weight:600}
.tables{margin-top:var(--s5)}
.split-slope{grid-template-columns:minmax(0,2.6fr) minmax(0,1fr)}
.groups{display:grid;gap:var(--s4);padding-top:var(--s5)}
.groups .block-title{margin:0}
.group{border-top:1px solid var(--line);padding-top:var(--s3)}
.group p{margin:0}
.group-k{font-size:14px;color:var(--ink-2)}
.group-k b{font-size:1.25rem;letter-spacing:-.02em;color:var(--ink);margin-right:4px;font-variant-numeric:tabular-nums}
.group-v{margin-top:var(--s1)!important;font-size:13px;color:var(--muted);line-height:1.5}

.legend{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:var(--s5);font-size:13px;color:var(--muted)}
.legend li{display:flex;align-items:center;gap:var(--s2)}
.sw-line{width:22px;height:0;border-top:1.5px solid var(--mark-strong)}
.sw-line.dashed{border-top:1.5px dashed var(--mark)}
.sw-dot{width:10px;height:10px;border-radius:50%;background:var(--mark-strong)}
.sw-dot.hollow{background:var(--bg);border:1.5px solid var(--mark)}

/* Q3 */
.cc{position:relative;padding-left:3.75rem;font-variant-numeric:tabular-nums}
.cc-grid{position:absolute;left:0;right:0;top:0;height:var(--cc-h)}
.cc-grid .tick{position:absolute;left:0;right:0;border-top:1px solid var(--line);height:0}
.cc-grid .tick b{position:absolute;left:0;top:-.7em;width:3rem;text-align:right;font-weight:400;font-size:12px;color:var(--muted)}
.cc-cols{position:relative;display:grid;gap:var(--s3)}
.cc-col{display:flex;flex-direction:column;align-items:center;min-width:0}
.cc-bar-area{position:relative;height:var(--cc-h);width:100%;display:flex;align-items:flex-end;justify-content:center}
.cc-bar-area i{display:block;width:min(64%,72px);border-radius:var(--r-mark) var(--r-mark) 0 0;transition:filter .2s var(--ease)}
.cc-col:hover .cc-bar-area i{filter:brightness(.85)}
.cc-val{position:absolute;left:0;right:0;text-align:center;margin-bottom:6px;font-size:12.5px;font-weight:600;white-space:nowrap}
.cc-x{margin-top:var(--s2);font-size:12.5px;color:var(--muted);white-space:nowrap}
.control{display:grid;gap:var(--s5)}
.control .block-title{margin:0}
.check{border-top:1px solid var(--line);padding-top:var(--s4)}
.check p{margin:0}
.check-k{font-weight:600;font-size:14.5px}
.check-eq{display:grid;grid-template-columns:1fr auto 1fr;align-items:baseline;gap:var(--s3);margin:var(--s2) 0 2px!important;
  font-size:1.6rem;font-weight:600;letter-spacing:-.03em}
.check-eq span:last-child{text-align:right}
.check-eq b{font-weight:400;color:var(--muted)}
.check.warn .check-eq b{color:var(--accent)}
.check-legend{display:flex;justify-content:space-between;font-size:12px;color:var(--faint)}
.check-v{margin-top:var(--s2)!important;font-size:13.5px;color:var(--ink-2)}
.check.warn .check-v{color:var(--accent-ink)}
.table-block{margin-top:var(--s6)}
.table-block h3{font-size:15px;font-weight:600;margin:0 0 var(--s3)}

/* Q4 dumbbell */
.db-head,.dumbbell li{display:grid;grid-template-columns:8.5rem minmax(0,1fr) 12.5rem;gap:var(--s4);align-items:center}
.db-head{font-size:11.5px;color:var(--faint);padding-bottom:var(--s2);border-bottom:1px solid var(--line)}
.db-axis{position:relative;height:16px}
.db-axis span{position:absolute;transform:translateX(-50%);white-space:nowrap;font-variant-numeric:tabular-nums}
.db-axis span:first-child{transform:none}
.db-axis span:last-child{transform:translateX(-100%)}
.db-cols{display:grid;grid-template-columns:1fr 1fr;text-align:right}
.dumbbell{list-style:none;margin:0;padding:0}
.dumbbell li{padding:7px 0;font-size:14px}
.dumbbell li:hover .seg{background:var(--mark-strong)}
.db-plot{position:relative;height:14px}
.db-plot .seg{position:absolute;top:6px;height:2px;background:var(--mark);transition:background .2s var(--ease)}
.db-plot .dot{position:absolute;top:2px;width:10px;height:10px;margin-left:-5px;border-radius:50%}
.dot.mean{background:var(--mark-strong)}
.dot.mean.accent{background:var(--accent)}
.dot.med{background:var(--bg);border:1.5px solid var(--mark)}
.db-v{display:grid;grid-template-columns:1fr 1fr;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.db-v b{font-weight:600}
.db-v span{color:var(--muted)}

/* Tables: right-aligned figures, one hairline between rows, sticky header. */
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r-box);background:var(--surface)}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th,td{padding:9px 14px;text-align:left;vertical-align:baseline;white-space:nowrap}
thead th{font-size:12px;font-weight:500;color:var(--muted);border-bottom:1px solid var(--line-2);background:var(--surface)}
tbody tr+tr td,tbody tr+tr th{border-top:1px solid var(--line)}
tbody tr{transition:background .15s var(--ease)}
tbody tr:hover{background:var(--accent-wash)}
td.num,th.num{text-align:right}
td.num{font-variant-numeric:tabular-nums}
td.id{font-family:var(--mono);font-size:12px;color:var(--faint)}
td.empty-row{color:var(--muted);text-align:center;padding:var(--s5)}
.leader td{padding:12px 14px;vertical-align:middle}
.leader .rank{font:500 13px var(--mono);color:var(--faint);width:2.5rem}
.leader .who{display:block;font-weight:600;color:var(--ink)}
.leader .sub{display:block;font-size:12.5px;color:var(--muted)}
.leader .ca{min-width:15rem}
.inline-bar{display:inline-block;width:6.5rem;height:8px;margin-right:var(--s3);vertical-align:middle;text-align:left}
.inline-bar i{display:block;height:100%;border-radius:var(--r-mark)}
.pop th[scope=row]{font-weight:500}
.pop .sw{margin-right:var(--s2);vertical-align:-1px}
.pop td.strong{font-weight:600}

details.data{margin-top:var(--s3);border-top:1px solid var(--line)}
details.data summary{display:flex;align-items:baseline;gap:var(--s3);padding:var(--s3) 0;cursor:pointer;list-style:none;
  font-size:13.5px;font-weight:500;color:var(--ink-2)}
details.data summary::-webkit-details-marker{display:none}
details.data summary::before{content:"+";font:500 14px var(--mono);color:var(--muted);width:1ch}
details.data[open] summary::before{content:"\\2212"}
details.data summary:hover{color:var(--ink)}
details.data summary code{color:var(--muted);font-weight:400}
details.data .count{margin-left:auto;font-size:12px;color:var(--faint);font-weight:400}
details.data .table-wrap{margin-bottom:var(--s4)}

/* Q6 */
.stack{display:flex;height:28px;gap:2px;margin-bottom:var(--s5)}
.stack i{display:block;height:100%;min-width:3px}
.stack i:first-child{border-radius:var(--r-mark) 0 0 var(--r-mark)}
.stack i:last-child{border-radius:0 var(--r-mark) var(--r-mark) 0}
.seg-base{background:var(--mark)}
.seg-0{background:var(--accent)}
.seg-1{background:color-mix(in srgb,var(--accent) 66%,var(--bg))}
.seg-2{background:color-mix(in srgb,var(--accent) 40%,var(--bg))}
.seg-3{background:color-mix(in srgb,var(--accent) 25%,var(--bg))}
.sw{display:inline-block;width:10px;height:10px;border-radius:2px;flex:none}
.loss{border-left:2px solid var(--accent);padding-left:var(--s5)}
.loss p{margin:0}
.loss-value{font-size:clamp(2rem,1.5rem + 1.6vw,2.75rem);font-weight:600;letter-spacing:-.04em;line-height:1;color:var(--accent-ink)}
.loss-text{margin-top:var(--s3)!important;color:var(--ink-2);font-size:14.5px;max-width:42ch}
.loss .source{margin-top:var(--s4)}
.trend-block .cc{max-width:560px}

.empty{border:1px dashed var(--line-2);border-radius:var(--r-box);padding:var(--s5);color:var(--muted);font-size:14px}
.empty p{margin:0}.empty p+p{margin-top:var(--s2);font-size:13px}

.foot{max-width:var(--wrap);margin:0 auto;padding:0 var(--gutter) var(--s8);color:var(--faint);font-size:12.5px}
.foot-in{border-top:1px solid var(--line-2);padding-top:var(--s6);display:flex;flex-wrap:wrap;justify-content:space-between;gap:var(--s3)}
.foot p{margin:0}

/* Laptop */
@media (max-width:1180px){
  .stamp{display:none}
  .topbar-in{grid-template-columns:auto 1fr}
  .topbar nav{justify-self:end}
  .hide-lg{display:none}
}
/* Tablet */
@media (max-width:1024px){
  .overview-grid{grid-template-columns:1fr 1fr}
  .overview-grid>.kpi-hero{grid-column:1/-1;border-bottom:1px solid var(--line)}
  .overview-grid>.bridge{padding-left:0;border-left:0}
  .split-chart,.split-trend,.split-risk,.split-slope{grid-template-columns:1fr;gap:var(--s6)}
  .note{max-width:52ch}
}
@media (max-width:820px){
  .brand span{display:none}
  .topbar-in{gap:var(--s3)}
  .findings ol{grid-template-columns:1fr}
  .hide-md{display:none}
  .barlist li{grid-template-columns:6.5rem minmax(0,1fr) auto;row-gap:2px}
  .bl-p{display:none}
  .db-head,.dumbbell li{grid-template-columns:6.5rem minmax(0,1fr) 9.5rem}
  .db-cols span:last-child,.db-v span{display:none}
  .db-cols,.db-v{grid-template-columns:1fr}
}
/* Phone */
@media (max-width:560px){
  body{font-size:14.5px}
  .brand{display:none}
  .topbar-in{grid-template-columns:minmax(0,1fr)}
  .topbar nav{justify-self:stretch}
  .overview-grid{grid-template-columns:1fr}
  .overview-grid>*,.overview-grid>*+*{padding:var(--s5) 0;border-left:0}
  .overview-grid>*+*{border-top:1px solid var(--line)}
  .overview-grid>.kpi-hero{border-bottom:0}
  .sec{padding:var(--s7) 0}
  .barlist li{grid-template-columns:7.25rem minmax(0,1fr) auto}
  .db-head,.dumbbell li{grid-template-columns:7.25rem minmax(0,1fr) 6.5rem}
  .db-axis span:not(:first-child):not(:last-child){display:none}
  .leader .ca{min-width:0}
  .inline-bar{display:none}
  .chart-slope{display:none}
  .groups{padding-top:0}
  .foot-in{flex-direction:column}
}
@media print{
  .topbar,.skip{display:none}
  .sec{break-inside:avoid-page}
  body{background:#fff}
}
"""
