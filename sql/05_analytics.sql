-- ===========================================================================
-- ANALYTICS - six questions metier
-- ===========================================================================

-- @analytics_name q1_total
-- Q1A - Chiffre d'affaires total sur les trois derniers mois
WITH bornes AS (
    SELECT MAX(d.full_date) AS dernier_jour
    FROM fact_ventes f
    JOIN dim_date d ON d.date_id = f.date_id
),
ventes_periode AS (
    SELECT f.*
    FROM fact_ventes f
    JOIN dim_date d ON d.date_id = f.date_id
    CROSS JOIN bornes b
    WHERE d.full_date > DATE_ADD('month', -3, b.dernier_jour)
)
SELECT
    ROUND(SUM(line_amount), 2) AS chiffre_affaires_net,
    COUNT(*) AS nombre_lignes,
    COUNT(DISTINCT CONCAT(CAST(invoiceno AS varchar), '|', CAST(date_id AS varchar))) AS nombre_commandes,
    ROUND(SUM(CASE WHEN NOT is_return THEN line_amount ELSE 0 END), 2) AS chiffre_affaires_brut,
    ROUND(SUM(CASE WHEN is_return THEN line_amount ELSE 0 END), 2) AS impact_retours
FROM ventes_periode;

-- @analytics_name q1_pays
-- Q1B - Chiffre d'affaires par pays sur les trois derniers mois
WITH bornes AS (
    SELECT MAX(d.full_date) AS dernier_jour
    FROM fact_ventes f
    JOIN dim_date d ON d.date_id = f.date_id
),
ventes_periode AS (
    SELECT f.*
    FROM fact_ventes f
    JOIN dim_date d ON d.date_id = f.date_id
    CROSS JOIN bornes b
    WHERE d.full_date > DATE_ADD('month', -3, b.dernier_jour)
),
ca_pays AS (
    SELECT
        country AS pays,
        COUNT(*) AS nombre_lignes,
        SUM(line_amount) AS chiffre_affaires
    FROM ventes_periode
    GROUP BY country
)
SELECT
    pays,
    nombre_lignes,
    ROUND(chiffre_affaires, 2) AS chiffre_affaires,
    ROUND(100.0 * chiffre_affaires / SUM(chiffre_affaires) OVER (), 2) AS part_chiffre_affaires_pct
FROM ca_pays
ORDER BY chiffre_affaires DESC;

-- @analytics_name q2_top_chiffre_affaires
-- Q2A - Top 10 produits par chiffre d'affaires
SELECT
    p.product_id AS produit_id,
    p.title AS produit,
    p.category AS categorie,
    ROUND(SUM(f.line_amount), 2) AS chiffre_affaires,
    SUM(f.quantity) AS quantite_vendue,
    ROUND(AVG(f.unit_price), 2) AS prix_unitaire_moyen
FROM fact_ventes f
JOIN dim_produit p ON p.product_id = f.product_id
WHERE p.product_id <> -1
GROUP BY p.product_id, p.title, p.category
ORDER BY chiffre_affaires DESC
LIMIT 10;

-- @analytics_name q2_top_quantite
-- Q2B - Top 10 produits par quantite vendue
SELECT
    p.product_id AS produit_id,
    p.title AS produit,
    p.category AS categorie,
    SUM(f.quantity) AS quantite_vendue,
    ROUND(SUM(f.line_amount), 2) AS chiffre_affaires
FROM fact_ventes f
JOIN dim_produit p ON p.product_id = f.product_id
WHERE p.product_id <> -1
GROUP BY p.product_id, p.title, p.category
ORDER BY quantite_vendue DESC
LIMIT 10;

-- @analytics_name q2_comparaison
-- Q2C - Comparaison des Top 10 par chiffre d'affaires et par quantite
WITH indicateurs_produit AS (
    SELECT
        p.product_id AS produit_id,
        p.title AS produit,
        p.category AS categorie,
        SUM(f.quantity) AS quantite_vendue,
        SUM(f.line_amount) AS chiffre_affaires
    FROM fact_ventes f
    JOIN dim_produit p ON p.product_id = f.product_id
    WHERE p.product_id <> -1
    GROUP BY p.product_id, p.title, p.category
),
classement AS (
    SELECT
        produit_id,
        produit,
        categorie,
        quantite_vendue,
        ROUND(chiffre_affaires, 2) AS chiffre_affaires,
        RANK() OVER (ORDER BY chiffre_affaires DESC) AS rang_chiffre_affaires,
        RANK() OVER (ORDER BY quantite_vendue DESC) AS rang_quantite
    FROM indicateurs_produit
)
SELECT
    produit_id,
    produit,
    categorie,
    chiffre_affaires,
    quantite_vendue,
    rang_chiffre_affaires,
    rang_quantite,
    CASE
        WHEN rang_chiffre_affaires <= 10 AND rang_quantite <= 10 THEN 'Dans les deux Top 10'
        WHEN rang_chiffre_affaires <= 10 THEN 'Top 10 chiffre affaires uniquement'
        WHEN rang_quantite <= 10 THEN 'Top 10 quantite uniquement'
        ELSE 'Hors Top 10'
    END AS statut_top_10
FROM classement
WHERE rang_chiffre_affaires <= 10 OR rang_quantite <= 10
ORDER BY
    CASE
        WHEN rang_chiffre_affaires <= 10 AND rang_quantite <= 10 THEN 1
        WHEN rang_chiffre_affaires <= 10 THEN 2
        ELSE 3
    END,
    rang_chiffre_affaires,
    rang_quantite;

-- @analytics_name q3_mensuel
-- Q3A - Evolution mensuelle du chiffre d'affaires et du nombre de commandes
SELECT
    d.year AS annee,
    d.month AS mois,
    d.month_name AS nom_mois,
    ROUND(SUM(f.line_amount), 2) AS chiffre_affaires,
    COUNT(*) AS nombre_lignes,
    COUNT(DISTINCT CONCAT(CAST(f.invoiceno AS varchar), '|', CAST(f.date_id AS varchar))) AS nombre_commandes,
    COUNT(DISTINCT f.invoiceno) AS nombre_factures_brutes,
    ROUND(
        SUM(f.line_amount)
        / NULLIF(COUNT(DISTINCT CONCAT(CAST(f.invoiceno AS varchar), '|', CAST(f.date_id AS varchar))), 0),
        2
    ) AS panier_moyen
FROM fact_ventes f
JOIN dim_date d ON d.date_id = f.date_id
GROUP BY d.year, d.month, d.month_name
ORDER BY d.year, d.month;

-- @analytics_name q3_controle
-- Q3B - Controle de coherence du comptage des commandes
WITH mensuel AS (
    SELECT
        d.year AS annee,
        d.month AS mois,
        COUNT(DISTINCT CONCAT(CAST(f.invoiceno AS varchar), '|', CAST(f.date_id AS varchar))) AS nombre_commandes,
        COUNT(DISTINCT f.invoiceno) AS nombre_factures_brutes
    FROM fact_ventes f
    JOIN dim_date d ON d.date_id = f.date_id
    GROUP BY d.year, d.month
),
totaux_mensuels AS (
    SELECT
        SUM(nombre_commandes) AS total_commandes_mensuelles,
        SUM(nombre_factures_brutes) AS total_factures_mensuelles
    FROM mensuel
),
totaux_reels AS (
    SELECT
        COUNT(DISTINCT CONCAT(CAST(invoiceno AS varchar), '|', CAST(date_id AS varchar))) AS total_commandes_reel,
        COUNT(DISTINCT invoiceno) AS total_factures_reel
    FROM fact_ventes
)
SELECT
    m.total_commandes_mensuelles,
    r.total_commandes_reel,
    m.total_factures_mensuelles,
    r.total_factures_reel
FROM totaux_mensuels m
CROSS JOIN totaux_reels r;

-- @analytics_name q4_panier_par_pays
-- Q4 - Panier moyen par pays
WITH commandes AS (
    SELECT
        f.invoiceno,
        f.date_id,
        f.country AS pays,
        SUM(f.line_amount) AS montant_commande,
        SUM(f.quantity) AS articles_commande
    FROM fact_ventes f
    GROUP BY f.invoiceno, f.date_id, f.country
)
SELECT
    pays,
    COUNT(*) AS nombre_commandes,
    ROUND(SUM(montant_commande), 2) AS chiffre_affaires,
    ROUND(AVG(montant_commande), 2) AS panier_moyen,
    ROUND(APPROX_PERCENTILE(montant_commande, 0.5), 2) AS panier_median,
    ROUND(AVG(articles_commande), 2) AS nombre_articles_moyen
FROM commandes
GROUP BY pays
ORDER BY panier_moyen DESC;

-- @analytics_name q5_top_clients
-- Q5 - Top 5 clients par chiffre d'affaires cumule
SELECT
    c.customer_id AS client_id,
    c.firstname || ' ' || c.lastname AS client,
    c.email AS courriel,
    c.city AS ville,
    c.company_name AS entreprise,
    ROUND(SUM(f.line_amount), 2) AS chiffre_affaires,
    COUNT(*) AS nombre_lignes,
    COUNT(DISTINCT CONCAT(CAST(f.invoiceno AS varchar), '|', CAST(f.date_id AS varchar))) AS nombre_commandes
FROM fact_ventes f
JOIN dim_client c ON c.customer_id = f.customer_id
WHERE c.customer_id > 0
GROUP BY c.customer_id, c.firstname, c.lastname, c.email, c.city, c.company_name
ORDER BY chiffre_affaires DESC
LIMIT 5;

-- @analytics_name q6_population_orpheline
-- Q6A - Cles orphelines, volume et impact sur le chiffre d'affaires
SELECT
    CASE
        WHEN product_id = -1 AND customer_id < 0 THEN 'Produit et client absents'
        WHEN product_id = -1 THEN 'Produit absent du catalogue'
        WHEN customer_id = -1 THEN 'Client supprime du catalogue'
        WHEN customer_id = -2 THEN 'Client non renseigne'
        ELSE 'Cles completes'
    END AS population,
    COUNT(*) AS nombre_lignes,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS part_lignes_pct,
    SUM(quantity) AS quantite_vendue,
    ROUND(SUM(line_amount), 2) AS chiffre_affaires,
    ROUND(100.0 * SUM(line_amount) / SUM(SUM(line_amount)) OVER (), 2) AS part_chiffre_affaires_pct
FROM fact_ventes
GROUP BY 1
ORDER BY chiffre_affaires DESC;

-- @analytics_name q6_impact_cles_orphelines
-- Q6B - Lignes et chiffre d'affaires exclus si les cles orphelines sont filtrees
WITH total_general AS (
    SELECT
        COUNT(*) AS total_lignes,
        SUM(line_amount) AS chiffre_affaires_total
    FROM fact_ventes
),
lignes_valides AS (
    SELECT
        COUNT(*) AS lignes_valides,
        SUM(f.line_amount) AS chiffre_affaires_valide
    FROM fact_ventes f
    JOIN dim_produit p
        ON p.product_id = f.product_id
       AND p.product_id <> -1
    JOIN dim_client c
        ON c.customer_id = f.customer_id
       AND c.customer_id > 0
)
SELECT
    total.total_lignes - valides.lignes_valides AS lignes_perdues,
    ROUND(total.chiffre_affaires_total - valides.chiffre_affaires_valide, 2) AS chiffre_affaires_perdu
FROM total_general total
CROSS JOIN lignes_valides valides;

-- @analytics_name q6_evolution_orphelins
-- Q6C - Evolution mensuelle des lignes avec cles orphelines
SELECT
    d.year AS annee,
    d.month AS mois,
    COUNT(*) AS nombre_lignes,
    COUNT_IF(f.product_id = -1 OR f.customer_id < 0) AS nombre_lignes_orphelines,
    ROUND(
        100.0 * COUNT_IF(f.product_id = -1 OR f.customer_id < 0) / COUNT(*),
        2
    ) AS part_orpheline_pct
FROM fact_ventes f
JOIN dim_date d ON d.date_id = f.date_id
GROUP BY d.year, d.month
ORDER BY d.year, d.month;
