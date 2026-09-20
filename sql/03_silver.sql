-- SILVER - cleaned, typed, deduplicated, Parquet partitioned

CREATE TABLE orders_clean
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/silver/orders_clean/',
    partitioned_by      = ARRAY['year', 'month']
) AS

-- R1 - deduplicate

WITH deduplicated AS (
    SELECT invoiceno, productid, quantity, invoicedate,
           unitprice, customerid, country,
           MAX(ingestion_date) AS source_ingestion_date
    FROM orders_raw
    GROUP BY 1, 2, 3, 4, 5, 6, 7
),
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

-- R6 - standardise

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
    ROUND(quantity * unit_price, 2)      AS line_amount,
    customer_id,
    country,
    is_return,
    CAST(invoice_timestamp AS date)      AS invoice_date,
    invoice_timestamp,
    source_ingestion_date,
    date_format(invoice_timestamp, '%Y') AS year,
    date_format(invoice_timestamp, '%m') AS month
FROM typed
WHERE invoice_timestamp IS NOT NULL
  AND unit_price > 0
  AND quantity IS NOT NULL;

-- products_clean

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
    brand,
    price                                              AS catalog_price,
    discountpercentage                                 AS discount_percentage,
    ROUND(price * (1 - discountpercentage / 100.0), 2) AS discounted_price,
    stock,
    dimensions.width                                   AS width,
    dimensions.height                                  AS height,
    dimensions.depth                                   AS depth,
    sku,
    rating,
    CARDINALITY(tags)                                  AS tag_count,
    tags,
    description,
    weight,
    warrantyinformation                                AS warranty_information,
    shippinginformation                                AS shipping_information,
    availabilitystatus                                 AS availability_status,
    minimumorderquantity                               AS minimum_order_quantity,
    ingestion_date                                     AS source_ingestion_date
FROM products_raw;

-- users_clean

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
    phone,
    username,
    age,
    gender,
    address.address                 AS address_street,
    address.city                    AS city,
    address.state                   AS state,
    address.statecode               AS state_code,
    address.postalcode              AS postal_code,
    address.country                 AS country,
    address.coordinates.lat         AS latitude,
    address.coordinates.lng         AS longitude,
    university,
    company.name                    AS company_name,
    company.department              AS company_department,
    company.title                   AS company_title,
    company.address.address         AS company_address_street,
    company.address.city            AS company_address_city,
    company.address.state           AS company_address_state,
    company.address.statecode       AS company_address_state_code,
    company.address.postalcode      AS company_address_postal_code,
    company.address.country         AS company_address_country,
    company.address.coordinates.lat AS company_address_lat,
    company.address.coordinates.lng AS company_address_lng,
    "role",
    ingestion_date                  AS source_ingestion_date
FROM users_raw;

-- Verification

SELECT COUNT(*)                   AS rows,
       ROUND(SUM(line_amount), 2) AS revenue,
       MIN(invoice_date)          AS first_day,
       MAX(invoice_date)          AS last_day
FROM orders_clean;
SELECT COUNT_IF(invoice_date IS NULL) AS null_date,
       COUNT_IF(unit_price IS NULL)   AS null_price,
       COUNT_IF(unit_price <= 0)      AS bad_price,
       COUNT_IF(quantity IS NULL)     AS null_quantity,
       COUNT_IF(country IS NULL)      AS unmapped_country,
       COUNT_IF(product_id IS NULL)   AS null_product
FROM orders_clean;
SELECT COUNT(DISTINCT country) AS countries FROM orders_clean;
SELECT year, month, COUNT(*) AS rows FROM orders_clean
GROUP BY year, month ORDER BY year, month;
SELECT is_return, COUNT(*) AS rows, ROUND(SUM(line_amount), 2) AS revenue
FROM orders_clean GROUP BY is_return;
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
SELECT 'products_clean' AS tbl, COUNT(*) AS rows, COUNT(DISTINCT product_id) AS keys
FROM products_clean
UNION ALL
SELECT 'users_clean', COUNT(*), COUNT(DISTINCT customer_id) FROM users_clean;
SELECT COUNT(*) AS bronze_still_intact FROM orders_raw;
