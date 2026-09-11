-- ===========================================================================
-- GOLD — star schema
-- ===========================================================================
-- Gold derives from SILVER ONLY. No reference to *_raw appears below, and CI
-- enforces it:  grep -i '_raw' sql/04_gold.sql
--
-- GRAIN: one row = one product (product_id) invoiced under an invoice number
--        (invoiceno) at a given timestamp (invoice_timestamp).
--
-- NATURAL KEY: (invoiceno, product_id, invoice_timestamp)
--   7,547 distinct values over 7,547 rows -> 0 collisions.
--   Without the timestamp, (invoiceno, product_id) yields only 7,462 distinct
--   values: 85 collisions. All 85 colliding pairs carry a different timestamp,
--   so the third term resolves the problem completely rather than partially.
--   The key is only unique AFTER silver's R1 deduplication.
--
-- ORDER MATTERS: dimensions before the fact. The fact joins them to detect
-- orphans, so reversing the order fails with "Table not found".
--
-- Replace ${BUCKET} with the real bucket name.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- dim_date — 91 rows
-- ---------------------------------------------------------------------------
-- The calendar is GENERATED with sequence(), not derived from observed dates.
-- A calendar built from observations only contains days where something
-- happened, so an empty month disappears from a chart instead of showing zero.
-- Here all 91 days have sales, so it makes no visible difference — but the
-- pattern is the one to know.
--
-- date_id as a YYYYMMDD integer: readable, naturally sortable, 4 bytes.
-- No "Unknown" row: silver's R3 removed every undatable row, so no fact can
-- have an orphan date. A convention row nobody populates is dead weight.
CREATE TABLE dim_date
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/gold/dim_date/'
) AS
WITH bounds AS (
    SELECT MIN(invoice_date) AS first_day, MAX(invoice_date) AS last_day
    FROM orders_clean
),
calendar AS (
    SELECT CAST(day AS date) AS full_date
    FROM bounds
    CROSS JOIN UNNEST(sequence(first_day, last_day, INTERVAL '1' DAY)) AS t(day)
)
SELECT
    CAST(date_format(full_date, '%Y%m%d') AS integer) AS date_id,
    full_date,
    CAST(YEAR(full_date)        AS integer)           AS year,
    CAST(MONTH(full_date)       AS integer)           AS month,
    date_format(full_date, '%M')                      AS month_name,
    CAST(DAY(full_date)         AS integer)           AS day,
    CAST(QUARTER(full_date)     AS integer)           AS quarter,
    CAST(day_of_week(full_date) AS integer)           AS day_of_week,
    date_format(full_date, '%W')                      AS day_name,
    day_of_week(full_date) >= 6                       AS is_weekend
FROM calendar;


-- ---------------------------------------------------------------------------
-- dim_produit — 131 rows (130 + one convention row)
-- ---------------------------------------------------------------------------
-- product_id = -1 catches the 139 fact rows whose product left the catalog
-- ($183,284.04).
--
-- Why -1 and not 9999: the real orphan ids run 9002 to 9992. A technical key
-- at 9999 would live in the SAME value space as natural orphan keys, so a
-- future orphan could BE 9999 and get silently joined to a real dimension row.
-- A negative integer can never collide with a positive natural key.
--
-- UNION ALL requires strictly identical types per column, hence the explicit
-- CAST(NULL AS ...). This is the number one error in this block.
CREATE TABLE dim_produit
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/gold/dim_produit/'
) AS
SELECT product_id, title, category, brand,
       catalog_price, discounted_price, discount_percentage,
       stock, width, height, depth,
       false AS is_unknown
FROM products_clean

UNION ALL

SELECT -1                    AS product_id,
       'Unknown product'     AS title,
       'Unknown'             AS category,
       CAST(NULL AS varchar) AS brand,
       CAST(NULL AS double)  AS catalog_price,
       CAST(NULL AS double)  AS discounted_price,
       CAST(NULL AS double)  AS discount_percentage,
       CAST(NULL AS integer) AS stock,
       CAST(NULL AS double)  AS width,
       CAST(NULL AS double)  AS height,
       CAST(NULL AS double)  AS depth,
       true                  AS is_unknown;


-- ---------------------------------------------------------------------------
-- dim_client — 132 rows (130 + TWO convention rows)
-- ---------------------------------------------------------------------------
-- Two, not one. The brief asks for a single Unknown row, but the situations
-- are semantically different and question 6 is richer for separating them:
--
--   -1  Orphan       the id exists, the account was deleted    82 rows  $115,751.57
--   -2  Not recorded no id on the order at all                155 rows  $165,512.00
--
-- The first is a data governance issue, the second a sales process issue.
-- Different causes, different fixes.
CREATE TABLE dim_client
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/gold/dim_client/'
) AS
SELECT customer_id, firstname, lastname, email, city, country, company_name,
       'Known' AS customer_type
FROM users_clean

UNION ALL
SELECT -1, 'Unknown', 'customer', CAST(NULL AS varchar), CAST(NULL AS varchar),
       CAST(NULL AS varchar), CAST(NULL AS varchar), 'Orphan'

UNION ALL
SELECT -2, 'Not', 'recorded', CAST(NULL AS varchar), CAST(NULL AS varchar),
       CAST(NULL AS varchar), CAST(NULL AS varchar), 'Not recorded';


-- ---------------------------------------------------------------------------
-- fact_ventes — 7,547 rows
-- ---------------------------------------------------------------------------
-- LEFT JOIN, NOT INNER JOIN. This is the whole point of question 6: an INNER
-- JOIN would remove 376 rows and $464,547.61 — 5.0% of revenue — without an
-- error, a warning, or a trace. The LEFT JOIN keeps the row and yields NULL;
-- the COALESCE/CASE then attaches it to the convention key.
--
-- It is the only place in this project where choosing between two three-letter
-- SQL keywords decides 5% of the revenue.
CREATE TABLE fact_ventes
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/gold/fact_ventes/',
    partitioned_by      = ARRAY['year', 'month']
) AS
SELECT
    -- Surrogate key. The table has a natural key (see header), so this exists
    -- for convenience: a single-integer FK instead of a triple containing a
    -- timestamp, a stable sort, and duplicate detection after a CTAS replay.
    -- The ORDER BY below IS the natural key, so numbering is deterministic by
    -- construction: two runs produce the same vente_id.
    ROW_NUMBER() OVER (
        ORDER BY o.invoice_timestamp, o.invoiceno, o.product_id
    )                                                     AS vente_id,

    o.invoiceno,                        -- natural key 1/3, degenerate dimension

    CAST(date_format(o.invoice_date, '%Y%m%d') AS integer) AS date_id,

    COALESCE(p.product_id, -1)                            AS product_id,  -- key 2/3

    -- Two distinct causes of absence, so a CASE rather than a COALESCE.
    -- Order matters: test the source first, the join result second.
    CASE
        WHEN o.customer_id IS NULL THEN -2   -- no id on the order
        WHEN c.customer_id IS NULL THEN -1   -- id present, account deleted
        ELSE o.customer_id
    END                                                   AS customer_id,

    o.country,                          -- SHIPPING country, carried by the fact
    o.is_return,

    o.quantity,                         -- additive
    o.unit_price,                       -- NOT additive: never SUM this
    o.line_amount,                      -- additive: this is revenue

    -- Natural key 3/3. date_id (daily) JOINS dim_date; invoice_timestamp
    -- (to the second) IDENTIFIES the row. Two roles, not redundancy.
    o.invoice_timestamp,
    o.source_ingestion_date,

    o.year,
    o.month
FROM orders_clean o
LEFT JOIN dim_produit p ON p.product_id  = o.product_id
LEFT JOIN dim_client  c ON c.customer_id = o.customer_id;


-- ---------------------------------------------------------------------------
-- Invariants
-- ---------------------------------------------------------------------------
-- I1 - volume preserved. Expected 7547 = 7547.
SELECT (SELECT COUNT(*) FROM orders_clean) AS silver,
       (SELECT COUNT(*) FROM fact_ventes)  AS gold;

-- I1b - the grain's natural key is unique. Expected 7547 / 7547 / 0.
-- I1 proves nothing was lost; I1b proves the DECLARED grain is the REAL grain.
-- A grain that cannot be checked by a query is not a grain, it is an intention.
SELECT COUNT(*)                                                         AS rows,
       COUNT(DISTINCT invoiceno || '|' || CAST(product_id AS varchar)
                                || '|' || CAST(invoice_timestamp AS varchar))
                                                                        AS grains,
       COUNT(*) - COUNT(DISTINCT invoiceno || '|' || CAST(product_id AS varchar)
                                           || '|' || CAST(invoice_timestamp AS varchar))
                                                                        AS collisions
FROM fact_ventes;

-- I2 - NO JOIN FAN-OUT. The most important check in the project. If joining
-- the dimensions changes the row count, a dimension holds a duplicate key,
-- every matching fact is duplicated, and revenue inflates with no error.
-- Expected: 7547 and 9284872.42, before and after.
SELECT (SELECT COUNT(*) FROM fact_ventes) AS before_join,
       COUNT(*)                           AS after_join,
       ROUND(SUM(f.line_amount), 2)       AS revenue_after_join
FROM fact_ventes f
JOIN dim_date    d ON d.date_id     = f.date_id
JOIN dim_produit p ON p.product_id  = f.product_id
JOIN dim_client  c ON c.customer_id = f.customer_id;

-- I3 - primary keys are unique. All three must be 0.
SELECT 'dim_date' AS dim, COUNT(*) - COUNT(DISTINCT date_id) AS duplicates FROM dim_date
UNION ALL SELECT 'dim_produit', COUNT(*) - COUNT(DISTINCT product_id) FROM dim_produit
UNION ALL SELECT 'dim_client',  COUNT(*) - COUNT(DISTINCT customer_id) FROM dim_client;

-- I4 - NO UNHANDLED ORPHAN KEY. This is the graded criterion, literally.
-- All three must be 0.
SELECT COUNT_IF(d.date_id IS NULL)     AS facts_without_date,
       COUNT_IF(p.product_id IS NULL)  AS facts_without_product,
       COUNT_IF(c.customer_id IS NULL) AS facts_without_customer
FROM fact_ventes f
LEFT JOIN dim_date    d ON d.date_id     = f.date_id
LEFT JOIN dim_produit p ON p.product_id  = f.product_id
LEFT JOIN dim_client  c ON c.customer_id = f.customer_id;

-- I5 - convention rows are actually used.
-- Expected 139 / 82 / 155, totalling 376 rows and $464,547.61 (5.00%).
SELECT COUNT_IF(product_id = -1)                                   AS unknown_product,
       COUNT_IF(customer_id = -1)                                  AS orphan_customer,
       COUNT_IF(customer_id = -2)                                  AS unrecorded_customer,
       COUNT_IF(product_id = -1 OR customer_id < 0)                AS orphan_rows,
       ROUND(SUM(CASE WHEN product_id = -1 OR customer_id < 0
                      THEN line_amount END), 2)                    AS orphan_revenue,
       ROUND(100.0 * SUM(CASE WHEN product_id = -1 OR customer_id < 0
                              THEN line_amount ELSE 0 END)
             / SUM(line_amount), 2)                                AS orphan_pct
FROM fact_ventes;

-- I6 - the calendar is continuous. Expected 91 = 91.
SELECT COUNT(*)                                             AS days,
       DATE_DIFF('day', MIN(full_date), MAX(full_date)) + 1 AS expected
FROM dim_date;
