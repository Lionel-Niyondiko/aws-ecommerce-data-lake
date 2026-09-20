-- QUALITY - measure the anomalies before deciding what to do about them

-- Completeness

SELECT
    COUNT(*)                                    AS total,
    COUNT_IF(invoiceno   = '')                  AS invoiceno_blank,
    COUNT_IF(productid   = '')                  AS productid_blank,
    COUNT_IF(quantity    = '')                  AS quantity_blank,
    COUNT_IF(invoicedate = '')                  AS invoicedate_blank,
    COUNT_IF(unitprice   = '')                  AS unitprice_blank,
    COUNT_IF(customerid  = '')                  AS customerid_blank,
    COUNT_IF(country     = '')                  AS country_blank
FROM orders_raw;

-- Exact duplicates

WITH groups AS (
    SELECT invoiceno, productid, quantity, invoicedate,
           unitprice, customerid, country, COUNT(*) AS n
    FROM orders_raw
    GROUP BY 1, 2, 3, 4, 5, 6, 7
    HAVING COUNT(*) > 1
)
SELECT COUNT(*)          AS duplicate_groups,
       SUM(n)            AS rows_involved,
       SUM(n) - COUNT(*) AS rows_to_remove,
       MAX(n)            AS largest_group
FROM groups;

-- Near-duplicates

WITH near AS (
    SELECT invoiceno, productid,
           COUNT(*)                    AS n,
           COUNT(DISTINCT invoicedate) AS distinct_dates,
           COUNT(DISTINCT unitprice)   AS distinct_prices,
           COUNT(DISTINCT quantity)    AS distinct_quantities
    FROM orders_raw
    GROUP BY invoiceno, productid
    HAVING COUNT(*) > 1
       AND COUNT(DISTINCT invoicedate || '|' || unitprice || '|' || quantity) > 1
)
SELECT COUNT(*)                           AS groups,
       SUM(n)                             AS rows,
       COUNT_IF(distinct_dates > 1)       AS dates_differ,
       COUNT_IF(distinct_prices > 1)      AS prices_differ,
       COUNT_IF(distinct_quantities > 1)  AS quantities_differ
FROM near;

-- Dates

SELECT
    COUNT(*)                                                        AS total,
    COUNT_IF(invoicedate = '')                                      AS blank,
    COUNT_IF(invoicedate <> ''
             AND TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')) IS NULL)
                                                                    AS unreadable,
    MIN(TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')))          AS min_date,
    MAX(TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')))          AS max_date
FROM orders_raw;
SELECT invoicedate, COUNT(*) AS n
FROM orders_raw
WHERE invoicedate <> ''
  AND TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')) IS NULL
GROUP BY invoicedate;

-- Prices

SELECT
    COUNT_IF(TRY_CAST(unitprice AS double) IS NULL) AS non_numeric,
    COUNT_IF(TRY_CAST(unitprice AS double) = 0)     AS zero,
    COUNT_IF(TRY_CAST(unitprice AS double) < 0)     AS negative,
    COUNT_IF(TRY_CAST(unitprice AS double) > 1000)  AS extreme,
    ROUND(MAX(TRY_CAST(unitprice AS double)), 2)    AS max_price
FROM orders_raw;
SELECT invoiceno LIKE 'C%'                          AS is_return,
       COUNT_IF(TRY_CAST(unitprice AS double) < 0)  AS price_negative,
       COUNT_IF(TRY_CAST(unitprice AS double) = 0)  AS price_zero,
       COUNT_IF(TRY_CAST(unitprice AS double) > 0)  AS price_positive
FROM orders_raw
GROUP BY invoiceno LIKE 'C%';

-- Country spellings

SELECT COUNT(DISTINCT country)        AS raw_spellings,
       COUNT(DISTINCT LOWER(country)) AS after_lower,
       10                             AS real_countries
FROM orders_raw;
WITH standardised AS (
    SELECT CASE LOWER(TRIM(country))
        WHEN 'switzerland'    THEN 'Switzerland'
        WHEN 'suisse'         THEN 'Switzerland'
        WHEN 'spain'          THEN 'Spain'
        WHEN 'espagne'        THEN 'Spain'
        WHEN 'italy'          THEN 'Italy'
        WHEN 'italie'         THEN 'Italy'
        WHEN 'germany'        THEN 'Germany'
        WHEN 'allemagne'      THEN 'Germany'
        WHEN 'united states'  THEN 'United States'
        WHEN 'usa'            THEN 'United States'
        WHEN 'u.s.a'          THEN 'United States'
        WHEN 'france'         THEN 'France'
        WHEN 'frnace'         THEN 'France'
        WHEN 'netherlands'    THEN 'Netherlands'
        WHEN 'pays-bas'       THEN 'Netherlands'
        WHEN 'united kingdom' THEN 'United Kingdom'
        WHEN 'uk'             THEN 'United Kingdom'
        WHEN 'u.k.'           THEN 'United Kingdom'
        WHEN 'portugal'       THEN 'Portugal'
        WHEN 'belgium'        THEN 'Belgium'
        WHEN 'belgique'       THEN 'Belgium'
        ELSE NULL
    END AS standard
    FROM orders_raw
)
SELECT COUNT(*)                   AS total,
       COUNT_IF(standard IS NULL) AS non_mapped,
       COUNT(DISTINCT standard)   AS countries
FROM standardised;

-- Orphan keys

WITH o AS (
    SELECT TRY_CAST(productid AS integer)  AS product_id,
           TRY_CAST(customerid AS integer) AS customer_id,
           customerid = ''                 AS customer_absent,
           TRY_CAST(quantity AS integer) * TRY_CAST(unitprice AS double) AS amount
    FROM orders_raw
)
SELECT
    COUNT_IF(p.id IS NULL AND o.product_id IS NOT NULL)            AS orphan_product_rows,
    ROUND(SUM(CASE WHEN p.id IS NULL THEN o.amount END), 2)        AS orphan_product_revenue,
    COUNT_IF(u.id IS NULL AND o.customer_id IS NOT NULL)           AS orphan_customer_rows,
    COUNT_IF(o.customer_absent)                                    AS missing_customer_rows,
    ROUND(SUM(o.amount), 2)                                        AS total_revenue
FROM o
LEFT JOIN products_raw p ON p.id = o.product_id
LEFT JOIN users_raw    u ON u.id = o.customer_id;
WITH o AS (
    SELECT TRY_CAST(productid AS integer)  AS product_id,
           TRY_CAST(customerid AS integer) AS customer_id,
           TRY_CAST(quantity AS integer) * TRY_CAST(unitprice AS double) AS amount
    FROM orders_raw
)
SELECT (SELECT COUNT(*) FROM o) - COUNT(*)                       AS rows_lost,
       ROUND((SELECT SUM(amount) FROM o) - SUM(o.amount), 2)     AS revenue_lost
FROM o
INNER JOIN products_raw p ON p.id = o.product_id
INNER JOIN users_raw    u ON u.id = o.customer_id;

-- Anomalies

WITH per_invoice AS (
    SELECT invoiceno, COUNT(DISTINCT invoicedate) AS distinct_dates
    FROM orders_raw WHERE invoicedate <> ''
    GROUP BY invoiceno
)
SELECT COUNT(*)                        AS invoices,
       COUNT_IF(distinct_dates > 1)    AS multi_dated,
       ROUND(100.0 * COUNT_IF(distinct_dates > 1) / COUNT(*), 1) AS pct
FROM per_invoice;
SELECT COUNT(*) AS products, COUNT_IF(brand IS NULL) AS without_brand
FROM products_raw;
SELECT address.country AS customer_country, COUNT(*) AS customers
FROM users_raw GROUP BY address.country;

-- Silver forecast

WITH base AS (SELECT DISTINCT invoiceno, productid, quantity, invoicedate,
                              unitprice, customerid, country FROM orders_raw),
typed AS (
    SELECT TRY_CAST(quantity  AS integer)                  AS quantity,
           TRY_CAST(unitprice AS double)                   AS unit_price,
           TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')) AS ts
    FROM base
)
SELECT (SELECT COUNT(*) FROM orders_raw)                              AS bronze,
       (SELECT COUNT(*) FROM base)                                    AS after_r1,
       COUNT_IF(ts IS NOT NULL)                                       AS after_r3,
       COUNT_IF(ts IS NOT NULL AND unit_price > 0)                    AS after_r4,
       COUNT_IF(ts IS NOT NULL AND unit_price > 0
                AND quantity IS NOT NULL)                             AS silver,
       ROUND(SUM(CASE WHEN ts IS NOT NULL AND unit_price > 0
                       AND quantity IS NOT NULL
                      THEN quantity * unit_price END), 2)             AS revenue
FROM typed;
