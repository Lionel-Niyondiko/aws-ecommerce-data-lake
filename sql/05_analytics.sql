-- ANALYTICS - the six business questions

-- Q1 - Total revenue, and revenue by country, over the last three months

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

-- Q2 - Top 10 products by revenue and by quantity

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
SELECT p.product_id, p.title, p.category,
       SUM(f.quantity)              AS quantity,
       ROUND(SUM(f.line_amount), 2) AS revenue
FROM fact_ventes f
JOIN dim_produit p ON p.product_id = f.product_id
WHERE p.product_id <> -1
GROUP BY p.product_id, p.title, p.category
ORDER BY quantity DESC
LIMIT 10;
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

-- Q3 - Monthly revenue and order count

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

-- Q4 - Average basket by country

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

-- Q5 - Top 5 customers by cumulative revenue

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

-- Q6 - Orphan keys: how many, what volume, what treatment

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
SELECT (SELECT COUNT(*) FROM fact_ventes) - COUNT(*)                  AS rows_lost,
       ROUND((SELECT SUM(line_amount) FROM fact_ventes)
             - SUM(f.line_amount), 2)                                 AS revenue_lost
FROM fact_ventes f
JOIN dim_produit p ON p.product_id  = f.product_id AND p.product_id  <> -1
JOIN dim_client  c ON c.customer_id = f.customer_id AND c.customer_id > 0;
SELECT d.year, d.month,
       COUNT(*)                                                  AS rows,
       COUNT_IF(f.product_id = -1 OR f.customer_id < 0)          AS orphan_rows,
       ROUND(100.0 * COUNT_IF(f.product_id = -1 OR f.customer_id < 0)
             / COUNT(*), 2)                                      AS pct_orphan
FROM fact_ventes f
JOIN dim_date d ON d.date_id = f.date_id
GROUP BY d.year, d.month
ORDER BY d.year, d.month;
