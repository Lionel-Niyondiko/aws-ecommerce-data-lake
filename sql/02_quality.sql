-- ===========================================================================
-- QUALITY — measure the anomalies before deciding what to do about them
-- ===========================================================================
-- This file produces nothing. It earns its place by predicting that silver
-- will hold 7,547 rows BEFORE they are built. Without that prediction the next
-- step is executable but not verifiable.
--
-- Every check prints its measured value next to the expected one. A check that
-- cannot fail is not a check.
--
-- TRY_CAST and TRY(...) return NULL instead of aborting, which is what makes
-- it possible to COUNT bad values rather than crash on them.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Completeness. Expected: quantity 116, date 36, customer 157, rest 0
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Exact duplicates: three different numbers, do not confuse them
--   154  distinct value combinations that repeat  <- what HAVING returns
--   310  physical rows involved                   <- SUM(n)
--   156  rows SELECT DISTINCT will remove         <- SUM(n) - COUNT(*)
-- Cross-check: 7956 - 156 = 7800
-- ---------------------------------------------------------------------------
WITH groups AS (
    SELECT invoiceno, productid, quantity, invoicedate,
           unitprice, customerid, country, COUNT(*) AS n
    FROM orders_raw
    GROUP BY 1, 2, 3, 4, 5, 6, 7
    HAVING COUNT(*) > 1
)
SELECT COUNT(*)          AS duplicate_groups,   -- 154
       SUM(n)            AS rows_involved,      -- 310
       SUM(n) - COUNT(*) AS rows_to_remove,     -- 156
       MAX(n)            AS largest_group       -- 3
FROM groups;

-- ---------------------------------------------------------------------------
-- Near-duplicates: same (invoiceno, productid), different values.
-- Expected 89 groups / 172 rows — and they are KEPT, not deduplicated.
--
-- Deduplicating with ROW_NUMBER() needs two things: a real business key, and
-- an ordering column expressing a version. Neither exists here. invoiceno is
-- not a key (see below), and invoicedate is a business attribute, not a
-- version timestamp. Sorting on it would delete 83 rows arbitrarily.
-- ---------------------------------------------------------------------------
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
SELECT COUNT(*)                           AS groups,              -- 89
       SUM(n)                             AS rows,                -- 172
       COUNT_IF(distinct_dates > 1)       AS dates_differ,        -- 83
       COUNT_IF(distinct_prices > 1)      AS prices_differ,       -- 83
       COUNT_IF(distinct_quantities > 1)  AS quantities_differ    -- 82
FROM near;

-- ---------------------------------------------------------------------------
-- Dates. Expected: 36 blank, 29 unreadable, 7891 valid.
-- Trino uses MySQL format strings: %i is MINUTES. Writing %M (month name)
-- makes every date return NULL and looks like total corruption.
-- ---------------------------------------------------------------------------
SELECT
    COUNT(*)                                                        AS total,
    COUNT_IF(invoicedate = '')                                      AS blank,
    COUNT_IF(invoicedate <> ''
             AND TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')) IS NULL)
                                                                    AS unreadable,
    MIN(TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')))          AS min_date,
    MAX(TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')))          AS max_date
FROM orders_raw;

-- One single bad value, 29 times: '31/02/2026'. It is wrong twice over —
-- wrong format AND a date that does not exist. Fixing the format is not enough.
SELECT invoicedate, COUNT(*) AS n
FROM orders_raw
WHERE invoicedate <> ''
  AND TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')) IS NULL
GROUP BY invoicedate;

-- ---------------------------------------------------------------------------
-- Prices. Expected: 45 zero, 29 negative, 0 above 1000, max 249.81.
-- The brief mentions "outlier prices". There are none on the high side. The
-- only anomalies are prices <= 0. The product catalog runs 0.79 to 14999.99
-- and is unrelated to these unit prices, so it cannot serve as a reference.
-- ---------------------------------------------------------------------------
SELECT
    COUNT_IF(TRY_CAST(unitprice AS double) IS NULL) AS non_numeric,    -- 0
    COUNT_IF(TRY_CAST(unitprice AS double) = 0)     AS zero,           -- 45
    COUNT_IF(TRY_CAST(unitprice AS double) < 0)     AS negative,       -- 29
    COUNT_IF(TRY_CAST(unitprice AS double) > 1000)  AS extreme,        -- 0
    ROUND(MAX(TRY_CAST(unitprice AS double)), 2)    AS max_price       -- 249.81
FROM orders_raw;

-- Are negative prices credit notes? No. All 29 sit on NORMAL invoices.
-- Returns are carried by negative QUANTITY, never by price.
-- Expected:  false | 29 | 43 | 7641      true | 0 | 2 | 241
SELECT invoiceno LIKE 'C%'                          AS is_return,
       COUNT_IF(TRY_CAST(unitprice AS double) < 0)  AS price_negative,
       COUNT_IF(TRY_CAST(unitprice AS double) = 0)  AS price_zero,
       COUNT_IF(TRY_CAST(unitprice AS double) > 0)  AS price_positive
FROM orders_raw
GROUP BY invoiceno LIKE 'C%';

-- ---------------------------------------------------------------------------
-- Country spellings. Expected: 39 raw -> 22 after lower() -> 10 real countries.
-- Four families: case, French translations, abbreviations, and one typo
-- ("Frnace", 38 rows). lower() alone only handles the first family.
-- ---------------------------------------------------------------------------
SELECT COUNT(DISTINCT country)        AS raw_spellings,   -- 39
       COUNT(DISTINCT LOWER(country)) AS after_lower,     -- 22
       10                             AS real_countries
FROM orders_raw;

-- Validate the mapping used by silver. non_mapped MUST be 0: a forgotten
-- spelling would become NULL and its revenue would vanish from "sales by
-- country" without any error.
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
        ELSE NULL                       -- deliberate: makes gaps visible
    END AS standard
    FROM orders_raw
)
SELECT COUNT(*)                   AS total,        -- 7956
       COUNT_IF(standard IS NULL) AS non_mapped,   -- MUST BE 0
       COUNT(DISTINCT standard)   AS countries     -- 10
FROM standardised;

-- ---------------------------------------------------------------------------
-- Orphan keys — the heart of business question 6.
-- Expected: 146 product rows / 84 customer rows / 157 missing customers.
--
-- Never use NOT IN here. "x NOT IN (SELECT id ...)" evaluates to NULL — hence
-- false — as soon as the subquery contains a single NULL, and returns zero
-- orphans without raising anything. Anti-join is immune to that.
-- ---------------------------------------------------------------------------
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

-- What a naive INNER JOIN would silently delete: about 3% of revenue.
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

-- ---------------------------------------------------------------------------
-- Anomalies the brief never mentions
-- ---------------------------------------------------------------------------

-- invoiceno is NOT an order key: 2226 distinct numbers, 1834 of them (82%)
-- carrying more than one date. Consequences: COUNT(DISTINCT invoiceno) per
-- month double-counts, and "average basket" cannot group on it alone.
WITH per_invoice AS (
    SELECT invoiceno, COUNT(DISTINCT invoicedate) AS distinct_dates
    FROM orders_raw WHERE invoicedate <> ''
    GROUP BY invoiceno
)
SELECT COUNT(*)                        AS invoices,          -- 2226
       COUNT_IF(distinct_dates > 1)    AS multi_dated,       -- 1834
       ROUND(100.0 * COUNT_IF(distinct_dates > 1) / COUNT(*), 1) AS pct  -- 82.4
FROM per_invoice;

-- brand is an ABSENT KEY, not a null value: 62 of 130 products.
-- discountedPrice does not exist at all — silver computes it.
SELECT COUNT(*) AS products, COUNT_IF(brand IS NULL) AS without_brand  -- 130 | 62
FROM products_raw;

-- Every customer is American. Sales by country MUST come from the fact table,
-- never from dim_client, or the answer is one row and no error.
SELECT address.country AS customer_country, COUNT(*) AS customers
FROM users_raw GROUP BY address.country;   -- United States | 130

-- ---------------------------------------------------------------------------
-- Silver forecast. Rules applied IN THIS ORDER:
--   7956 -> R1 distinct (-156) -> 7800
--        -> R3 valid date (-65) -> 7735
--        -> R4 price > 0  (-74) -> 7661
--        -> R5 quantity   (-114) -> 7547        revenue 9,284,872.42
--
-- Note 156+65+74+116 = 411 but the real loss is 409: the rules overlap.
-- Naive subtraction is wrong, which is exactly why this is measured.
-- ---------------------------------------------------------------------------
WITH base AS (SELECT DISTINCT invoiceno, productid, quantity, invoicedate,
                              unitprice, customerid, country FROM orders_raw),
typed AS (
    SELECT TRY_CAST(quantity  AS integer)                  AS quantity,
           TRY_CAST(unitprice AS double)                   AS unit_price,
           TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s')) AS ts
    FROM base
)
SELECT (SELECT COUNT(*) FROM orders_raw)                              AS bronze,      -- 7956
       (SELECT COUNT(*) FROM base)                                    AS after_r1,    -- 7800
       COUNT_IF(ts IS NOT NULL)                                       AS after_r3,    -- 7735
       COUNT_IF(ts IS NOT NULL AND unit_price > 0)                    AS after_r4,    -- 7661
       COUNT_IF(ts IS NOT NULL AND unit_price > 0
                AND quantity IS NOT NULL)                             AS silver,      -- 7547
       ROUND(SUM(CASE WHEN ts IS NOT NULL AND unit_price > 0
                       AND quantity IS NOT NULL
                      THEN quantity * unit_price END), 2)             AS revenue      -- 9284872.42
FROM typed;
