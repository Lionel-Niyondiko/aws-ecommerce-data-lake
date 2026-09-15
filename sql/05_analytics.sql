-- ===========================================================================
-- ANALYTICS - the six business questions
-- ===========================================================================
-- Conventions, stated before any number:
--
--   REVENUE   SUM(line_amount), returns INCLUDED as negative amounts. Net
--             revenue. Gross is $9,613,428.82; the 234 returns weigh
--             -$328,556.40; net is $9,284,872.42.
--
--   ORDER     the pair (invoiceno, date_id), not invoiceno alone. 82% of
--             invoice numbers carry several dates, so counting raw numbers per
--             month sums to 4,986 for 2,214 real invoices - a 125% overcount,
--             and a NON-ADDITIVE metric. With the date: months sum to 7,439,
--             which equals the total.
--
--   COUNTRY   shipping country, carried by the fact. All 130 catalog customers
--             are American, so dim_client.country would return one row.
--
--   ORPHANS   attached to convention rows. Questions 2 and 5 exclude them
--             explicitly; 1, 3 and 4 keep them so revenue stays complete;
--             question 6 studies them.
-- ===========================================================================


-- ###########################################################################
-- Q1 - Total revenue, and revenue by country, over the last three months
-- ###########################################################################

WITH bounds AS (
    SELECT MAX(d.full_date) AS last_day
    FROM fact_ventes f JOIN dim_date d ON d.date_id = f.date_id
)
SELECT
    ROUND(SUM(f.line_amount), 2)                                  AS net_revenue,
    COUNT(*)                                                      AS rows,
    COUNT(DISTINCT f.invoiceno || '|' || CAST(f.date_id AS varchar)) AS orders,
    ROUND(SUM(CASE WHEN NOT f.is_return THEN f.line_amount END), 2)  AS gross_revenue,
    ROUND(SUM(CASE WHEN f.is_return THEN f.line_amount END), 2)      AS returns_impact
FROM fact_ventes f
JOIN dim_date d ON d.date_id = f.date_id
CROSS JOIN bounds b
WHERE d.full_date > DATE_ADD('month', -3, b.last_day);

-- Expected, by descending revenue:
--   France 1,015,193.79 | Switzerland 1,015,005.54 | Spain 1,013,659.20
--   Italy 972,039.36 | United States 945,853.08 | Germany 928,843.98
--   United Kingdom 881,285.16 | Netherlands 875,339.35 | Belgium 822,041.65
--   Portugal 815,611.31
-- Ten countries between 8.8% and 10.9%: no market dominates.

WITH bounds AS (
    SELECT MAX(d.full_date) AS last_day
    FROM fact_ventes f JOIN dim_date d ON d.date_id = f.date_id
)
SELECT
    f.country,
    COUNT(*)                                            AS rows,
    ROUND(SUM(f.line_amount), 2)                        AS revenue,
    ROUND(100.0 * SUM(f.line_amount)
          / SUM(SUM(f.line_amount)) OVER (), 2)         AS pct_revenue
FROM fact_ventes f
JOIN dim_date d ON d.date_id = f.date_id
CROSS JOIN bounds b
WHERE d.full_date > DATE_ADD('month', -3, b.last_day)
GROUP BY f.country
ORDER BY revenue DESC;


-- ###########################################################################
-- Q2 - Top 10 products by revenue and by quantity.
-- ###########################################################################
-- Answer: no - 7 of 10 appear in both.
--
-- product_id = -1 is excluded. Without that filter "Unknown product"
-- ($183,284) would rank THIRD by revenue.

SELECT p.product_id, p.title, p.category,
       ROUND(SUM(f.line_amount), 2) AS revenue,
       SUM(f.quantity)              AS quantity,
       ROUND(AVG(f.unit_price), 2)  AS avg_price   
FROM fact_ventes f
JOIN dim_produit p ON p.product_id = f.product_id
WHERE p.product_id <> -1
GROUP BY p.product_id, p.title, p.category
ORDER BY revenue DESC
LIMIT 10;
-- 1. Essence Mascara Lash Princess 109,225.25 | 2. Apple iPhone Charger 104,524.96
-- 3. Plant Pot 98,308.00 | 4. Apple AirPods Max Silver 94,543.26

SELECT p.product_id, p.title, p.category,
       SUM(f.quantity)              AS quantity,
       ROUND(SUM(f.line_amount), 2) AS revenue
FROM fact_ventes f
JOIN dim_produit p ON p.product_id = f.product_id
WHERE p.product_id <> -1
GROUP BY p.product_id, p.title, p.category
ORDER BY quantity DESC
LIMIT 10;
-- 1. Apple iPhone Charger 830 | 2. Essence Mascara 785
-- 3. Tissue Paper Box 761  <- high volume, absent from the revenue top ten

-- Overlap, computed rather than eyeballed. Expected 7 / 3 / 3.
WITH ranked AS (
    SELECT p.product_id,
           RANK() OVER (ORDER BY SUM(f.line_amount) DESC) AS rank_revenue,
           RANK() OVER (ORDER BY SUM(f.quantity)    DESC) AS rank_quantity
    FROM fact_ventes f
    JOIN dim_produit p ON p.product_id = f.product_id
    WHERE p.product_id <> -1
    GROUP BY p.product_id
)
SELECT COUNT_IF(rank_revenue <= 10 AND rank_quantity <= 10) AS in_both,
       COUNT_IF(rank_revenue <= 10 AND rank_quantity >  10) AS revenue_only,
       COUNT_IF(rank_revenue >  10 AND rank_quantity <= 10) AS quantity_only
FROM ranked;


-- ###########################################################################
-- Q3 - Monthly revenue and order count
-- ###########################################################################

SELECT
    d.year, d.month, d.month_name,
    ROUND(SUM(f.line_amount), 2) AS revenue,
    COUNT(*)                     AS rows,
    COUNT(DISTINCT f.invoiceno || '|' || CAST(f.date_id AS varchar)) AS orders,
    COUNT(DISTINCT f.invoiceno)  AS raw_invoice_numbers,
    ROUND(SUM(f.line_amount)
          / COUNT(DISTINCT f.invoiceno || '|' || CAST(f.date_id AS varchar)), 2)
                                 AS avg_basket
FROM fact_ventes f
JOIN dim_date d ON d.date_id = f.date_id
GROUP BY d.year, d.month, d.month_name
ORDER BY d.year, d.month;

-- 2026-04  1,646,379.06 | 1401 | 1382 | 1057 | 1191.30   (partial)
-- 2026-05  3,104,257.60 | 2547 | 2510 | 1543 | 1236.76
-- 2026-06  3,197,460.70 | 2453 | 2418 | 1488 | 1322.36
-- 2026-07  1,336,775.06 | 1146 | 1129 |  898 | 1184.03   (partial)


SELECT SUM(orders)      AS monthly_sum_orders,
       (SELECT COUNT(DISTINCT invoiceno || '|' || CAST(date_id AS varchar))
        FROM fact_ventes)                       AS real_total_orders,
       SUM(raw_invoices) AS monthly_sum_invoices,
       (SELECT COUNT(DISTINCT invoiceno) FROM fact_ventes) AS real_total_invoices
FROM (
    SELECT COUNT(DISTINCT f.invoiceno || '|' || CAST(f.date_id AS varchar)) AS orders,
           COUNT(DISTINCT f.invoiceno)                                      AS raw_invoices
    FROM fact_ventes f JOIN dim_date d ON d.date_id = f.date_id
    GROUP BY d.year, d.month
);


-- ###########################################################################
-- Q4 - Average basket by country
-- ###########################################################################
-- Two-step aggregation is mandatory. AVG(line_amount) straight off the fact
-- gives the average LINE (~1,230) not the average ORDER (1,248.13) - two
-- different metrics with nearly the same name.

WITH orders AS (
    SELECT f.invoiceno, f.date_id, f.country,
           SUM(f.line_amount) AS order_amount,
           SUM(f.quantity)    AS order_items
    FROM fact_ventes f
    GROUP BY f.invoiceno, f.date_id, f.country
)
SELECT country,
       COUNT(*)                                          AS orders,
       ROUND(SUM(order_amount), 2)                       AS revenue,
       ROUND(AVG(order_amount), 2)                       AS avg_basket,
       ROUND(APPROX_PERCENTILE(order_amount, 0.5), 2)    AS median_basket,
       ROUND(AVG(order_items), 2)                        AS avg_items
FROM orders
GROUP BY country
ORDER BY avg_basket DESC;

-- France 1,342.85 (756 orders) ... Switzerland 1,178.87 (861 orders)
-- Global average basket: 1,248.13


-- ###########################################################################
-- Q5 - Top 5 customers by cumulative revenue
-- ###########################################################################
-- Flag: customer_id < 0 excluded. Without that filter "Not recorded" (-2,
-- $165,512) would top the ranking: a bucket of anonymous orders presented
-- as a person.

SELECT c.customer_id,
       c.firstname || ' ' || c.lastname AS customer,
       c.email, c.city, c.company_name,
       ROUND(SUM(f.line_amount), 2)     AS revenue,
       COUNT(*)                         AS rows,
       COUNT(DISTINCT f.invoiceno || '|' || CAST(f.date_id AS varchar)) AS orders
FROM fact_ventes f
JOIN dim_client c ON c.customer_id = f.customer_id
WHERE c.customer_id > 0
GROUP BY c.customer_id, c.firstname, c.lastname, c.email, c.city, c.company_name
ORDER BY revenue DESC
LIMIT 5;
-- 122 Liam Smith 139,567.96 | 125 Logan Lee 123,003.85 | 58 Bella Grant 110,278.44
-- 49 Jacob Cooper 107,168.11 | 11 Liam Garcia 105,617.41



-- ###########################################################################
-- Q6 - Orphan keys: how many, what volume, what treatment
-- ###########################################################################
-- Expected:
--   Unknown product      139 rows (1.84%) | qty 1,441 | $183,284.04 (1.97%)
--   Orphan customer       82 rows (1.09%) | qty   830 | $115,751.57 (1.25%)
--   Unrecorded customer  155 rows (2.05%) | qty 1,345 | $165,512.00 (1.78%)
--   AT LEAST ONE         376 rows (4.98%) | qty 3,616 | $464,547.61 (5.00%)

SELECT
    CASE
        WHEN product_id = -1 AND customer_id < 0 THEN 'Product AND customer missing'
        WHEN product_id = -1                     THEN 'Product removed from catalog'
        WHEN customer_id = -1                    THEN 'Customer deleted from catalog'
        WHEN customer_id = -2                    THEN 'Customer not recorded'
        ELSE                                          'Complete keys'
    END                                                       AS population,
    COUNT(*)                                                  AS rows,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)        AS pct_rows,
    SUM(quantity)                                             AS quantity,
    ROUND(SUM(line_amount), 2)                                AS revenue,
    ROUND(100.0 * SUM(line_amount)
          / SUM(SUM(line_amount)) OVER (), 2)                 AS pct_revenue
FROM fact_ventes
GROUP BY 1
ORDER BY revenue DESC;

-- What a naive INNER JOIN would have cost. Expected -376 rows, -464,547.61.
-- No error, no warning. That is the entire point of the question.

SELECT (SELECT COUNT(*) FROM fact_ventes) - COUNT(*)                  AS rows_lost,
       ROUND((SELECT SUM(line_amount) FROM fact_ventes)
             - SUM(f.line_amount), 2)                                 AS revenue_lost
FROM fact_ventes f
JOIN dim_produit p ON p.product_id  = f.product_id AND p.product_id  <> -1
JOIN dim_client  c ON c.customer_id = f.customer_id AND c.customer_id > 0;

-- Distribution over time: is this a background rate or a one-off incident?
-- Steady near 5% across all four months, so it is structural. A failed batch
-- on a single day would show as a spike.

SELECT d.year, d.month,
       COUNT(*)                                                  AS rows,
       COUNT_IF(f.product_id = -1 OR f.customer_id < 0)          AS orphan_rows,
       ROUND(100.0 * COUNT_IF(f.product_id = -1 OR f.customer_id < 0)
             / COUNT(*), 2)                                      AS pct_orphan
FROM fact_ventes f
JOIN dim_date d ON d.date_id = f.date_id
GROUP BY d.year, d.month
ORDER BY d.year, d.month;

-- TREATMENT: orphan rows are ATTACHED to convention rows (-1, -2), not
-- excluded and not isolated in a separate table.



