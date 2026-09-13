-- ===========================================================================
-- SILVER — cleaned, typed, deduplicated, Parquet partitioned
-- ===========================================================================
-- Silver derives from bronze and never writes back to it. Deleting silver/
-- entirely and replaying this file must reproduce the same 7,547 rows: silver
-- is a computed cache, bronze is the source of truth.
--
-- Silver cleans FORM, never MEANING. The test: would two different business
-- teams agree? "31/02/2026 is not a date" — yes, consensus, so it belongs
-- here. "A row without a customer should be attached to an Unknown customer"
-- — that is a judgement call, so it belongs to gold.
--
-- CTAS rules that bite:
--   1. partition columns must be LAST in the SELECT
--   2. external_location must be EMPTY
--   3. DROP TABLE does not delete the files (tables are external)
--   4. a CTAS registers its own partitions — no MSCK needed
-- Rules 2 and 3 together produce the lab's most frustrating error, which is
-- why run_pipeline.sh always drops the table AND clears the prefix.
--
-- Replace ${BUCKET} with the real bucket name.
-- ===========================================================================

CREATE TABLE orders_clean
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/silver/orders_clean/',
    partitioned_by      = ARRAY['year', 'month']
) AS

-- R1 - deduplicate. GROUP BY on the seven BUSINESS columns, not SELECT
-- DISTINCT *: the latter would include ingestion_date, so a second ingestion
-- would leave every row twice and deduplicate nothing. Grouping this way also
-- lets us carry MAX(ingestion_date) as lineage back to bronze.
WITH deduplicated AS (
    SELECT invoiceno, productid, quantity, invoicedate,
           unitprice, customerid, country,
           MAX(ingestion_date) AS source_ingestion_date
    FROM orders_raw
    GROUP BY 1, 2, 3, 4, 5, 6, 7
),

-- Type here, filter below. Separating the two keeps each rule readable.
typed AS (
    SELECT
        invoiceno,
        TRY_CAST(productid  AS integer)                    AS product_id,
        TRY_CAST(quantity   AS integer)                    AS quantity,
        TRY_CAST(unitprice  AS double)                     AS unit_price,
        TRY_CAST(customerid AS integer)                    AS customer_id,
        TRY(date_parse(invoicedate, '%Y-%m-%d %H:%i:%s'))  AS invoice_timestamp,
        invoiceno LIKE 'C%'                                AS is_return,
        source_ingestion_date,

        -- R6 - standardise 39 spellings into 10 countries.
        -- ELSE NULL rather than ELSE country: a forgotten spelling must become
        -- VISIBLE, not slip through and pollute revenue by country.
        CASE LOWER(TRIM(country))
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
        END AS country
    FROM deduplicated
)

SELECT
    invoiceno,
    product_id,
    quantity,
    unit_price,
    ROUND(quantity * unit_price, 2)      AS line_amount,   -- R10, additive measure
    customer_id,                                           -- R8: NULL is kept
    country,
    is_return,                                             -- R7
    CAST(invoice_timestamp AS date)      AS invoice_date,  -- joins dim_date
    invoice_timestamp,                                     -- identifies the row
    source_ingestion_date,

    -- Partition columns LAST. Bronze partitions on arrival date, silver on the
    -- business date: an April order can be ingested in August.
    date_format(invoice_timestamp, '%Y') AS year,
    date_format(invoice_timestamp, '%m') AS month
FROM typed
WHERE invoice_timestamp IS NOT NULL   -- R3: -65 rows
  AND unit_price > 0                  -- R4: -74 rows
  AND quantity IS NOT NULL;           -- R5: -114 rows


-- ---------------------------------------------------------------------------
-- products_clean — not partitioned. 130 rows; partitioning would create more
-- metadata than data. The brief asks for partitioned Parquet in silver; that
-- applies where it means something, which is the fact-like table.
-- ---------------------------------------------------------------------------
CREATE TABLE products_clean
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/silver/products_clean/'
) AS
SELECT
    id                                                 AS product_id,
    title,
    category,
    brand,                                             -- NULL for 62 of 130
    price                                              AS catalog_price,
    discountpercentage                                 AS discount_percentage,

    -- discountedPrice does NOT exist in the source. This column is COMPUTED,
    -- not extracted — a transformation, and documented as one.
    ROUND(price * (1 - discountpercentage / 100.0), 2) AS discounted_price,

    stock,
    dimensions.width                                   AS width,
    dimensions.height                                  AS height,
    dimensions.depth                                   AS depth,
    sku,
    rating,
    CARDINALITY(tags)                                  AS tag_count,

    -- Kept: tag_count answers "how many", tags answers "which". A count is a
    -- summary of the list, never a substitute for it.
    tags,

    -- Kept: the only free-text field describing the product. Every search,
    -- classification or text analysis has to start from it.
    description,

    -- Kept: the dimensions were already propagated, the mass was not. Shipping
    -- cost per unit is unanswerable without it.
    weight,

    -- Kept: after-sales terms segment the catalog as much as category does.
    warrantyinformation                                AS warranty_information,

    -- Kept: the delivery promise is a commercial attribute, comparable across
    -- products and quotable in a report.
    shippinginformation                                AS shipping_information,

    -- Kept: stock says how many are left, this says whether the product is
    -- orderable at all. They disagree often enough to matter.
    availabilitystatus                                 AS availability_status,

    -- Kept: the minimum order quantity constrains any basket analysis, and
    -- leaving it here would send the reader back to bronze to find it.
    minimumorderquantity                               AS minimum_order_quantity,

    ingestion_date                                     AS source_ingestion_date
FROM products_raw;


-- ---------------------------------------------------------------------------
-- users_clean — flattens address (2 levels) and company (3 levels).
--
-- country is 'United States' for all 130 customers. The column is kept for
-- completeness, but revenue by country must come from the FACT table. Using
-- this one returns a single row and raises nothing.
-- ---------------------------------------------------------------------------
CREATE TABLE users_clean
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/silver/users_clean/'
) AS
SELECT
    id                              AS customer_id,
    firstname,
    lastname,
    email,

    -- Kept: the two contact channels. Reachability, and duplicate-account
    -- detection, are questions the dimension has to be able to answer.
    phone,
    username,

    age,
    gender,

    -- Kept: the street line completes an address whose city, state and postal
    -- code were already propagated. Half an address is not an address.
    address.address                 AS address_street,
    address.city                    AS city,
    address.state                   AS state,

    -- Kept: the two-letter code is what joins to external geographic
    -- reference data. The spelled-out state does not.
    address.statecode               AS state_code,

    address.postalcode              AS postal_code,
    address.country                 AS country,

    -- Kept: the only geospatial signal in the source. A distance or catchment
    -- question is not excluded a priori, and it cannot be reconstructed later.
    address.coordinates.lat         AS latitude,
    address.coordinates.lng         AS longitude,

    -- Kept: a segmentation axis the catalog offers for free.
    university,

    company.name                    AS company_name,
    company.department              AS company_department,

    -- Kept: seniority is what separates a decision maker from an end user in
    -- a B2B reading of the same table.
    company.title                   AS company_title,

    -- Kept: the employer address is a second, independent geography. Billing
    -- and delivery questions do not always resolve to the home address.
    company.address.address         AS company_address_street,
    company.address.city            AS company_address_city,
    company.address.state           AS company_address_state,
    company.address.statecode       AS company_address_state_code,
    company.address.postalcode      AS company_address_postal_code,
    company.address.country         AS company_address_country,
    company.address.coordinates.lat AS company_address_lat,
    company.address.coordinates.lng AS company_address_lng,

    -- Kept: separates an admin account from a real customer, which is exactly
    -- the kind of row an analysis has to be able to exclude. Reserved word:
    -- backticks in DDL, double quotes in SELECT (see 01_bronze.sql).
    "role",

    ingestion_date                  AS source_ingestion_date
FROM users_raw;


-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Expected: 7547 rows, revenue 9284872.42
SELECT COUNT(*)                   AS rows,          -- 7547
       ROUND(SUM(line_amount), 2) AS revenue,       -- 9284872.42
       MIN(invoice_date)          AS first_day,     -- 2026-04-14
       MAX(invoice_date)          AS last_day       -- 2026-07-13
FROM orders_clean;

-- No anomaly survived cleaning. All six must be 0.
SELECT COUNT_IF(invoice_date IS NULL) AS null_date,
       COUNT_IF(unit_price IS NULL)   AS null_price,
       COUNT_IF(unit_price <= 0)      AS bad_price,
       COUNT_IF(quantity IS NULL)     AS null_quantity,
       COUNT_IF(country IS NULL)      AS unmapped_country,   -- critical
       COUNT_IF(product_id IS NULL)   AS null_product
FROM orders_clean;

-- 39 spellings collapsed to exactly 10 countries.
SELECT COUNT(DISTINCT country) AS countries FROM orders_clean;   -- 10

-- Four partitions. Expected 1401 / 2547 / 2453 / 1146.
SELECT year, month, COUNT(*) AS rows FROM orders_clean
GROUP BY year, month ORDER BY year, month;

-- Returns keep their negative sign. Expected 234 rows, -328556.40.
SELECT is_return, COUNT(*) AS rows, ROUND(SUM(line_amount), 2) AS revenue
FROM orders_clean GROUP BY is_return;

-- ORPHANS MUST STILL BE HERE. Expected 376 rows / 464547.61.
-- Seeing 0 would be a failure, not a success: it would mean silver dropped
-- them, which is a business decision taken far too early.
SELECT COUNT_IF(p.product_id IS NULL
                OR o.customer_id IS NULL
                OR u.customer_id IS NULL)                        AS orphan_rows,
       ROUND(SUM(CASE WHEN p.product_id IS NULL
                       OR o.customer_id IS NULL
                       OR u.customer_id IS NULL
                      THEN o.line_amount END), 2)                AS orphan_revenue
FROM orders_clean o
LEFT JOIN products_clean p ON p.product_id  = o.product_id
LEFT JOIN users_clean    u ON u.customer_id = o.customer_id;

-- Dimensions: 130 / 130, no duplicate keys.
SELECT 'products_clean' AS tbl, COUNT(*) AS rows, COUNT(DISTINCT product_id) AS keys
FROM products_clean
UNION ALL
SELECT 'users_clean', COUNT(*), COUNT(DISTINCT customer_id) FROM users_clean;

-- Bronze untouched.
SELECT COUNT(*) AS bronze_still_intact FROM orders_raw;   -- 7956
