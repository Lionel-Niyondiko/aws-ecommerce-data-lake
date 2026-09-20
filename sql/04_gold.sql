-- GOLD - star schema

-- dim_date

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

-- dim_produit

CREATE TABLE dim_produit
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/gold/dim_produit/'
) AS
SELECT product_id, title, category, brand,
       catalog_price, discounted_price, discount_percentage,
       stock, width, height, depth,
       sku, rating, tag_count, tags,
       description, weight,
       warranty_information, shipping_information,
       availability_status, minimum_order_quantity,
       source_ingestion_date,
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
       CAST(NULL AS varchar) AS sku,
       CAST(NULL AS double)  AS rating,
       CAST(NULL AS bigint)  AS tag_count,
       CAST(NULL AS array(varchar)) AS tags,
       CAST(NULL AS varchar) AS description,
       CAST(NULL AS double)  AS weight,
       CAST(NULL AS varchar) AS warranty_information,
       CAST(NULL AS varchar) AS shipping_information,
       CAST(NULL AS varchar) AS availability_status,
       CAST(NULL AS integer) AS minimum_order_quantity,
       CAST(NULL AS varchar) AS source_ingestion_date,
       true                  AS is_unknown;

-- dim_client

CREATE TABLE dim_client
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/gold/dim_client/'
) AS
SELECT customer_id, firstname, lastname, email,
       phone, username, age, gender,
       address_street, city, state, state_code, postal_code, country,
       latitude, longitude,
       university,
       company_name, company_department, company_title,
       company_address_street, company_address_city, company_address_state,
       company_address_state_code, company_address_postal_code,
       company_address_country, company_address_lat, company_address_lng,
       "role",
       source_ingestion_date,
       'Known' AS customer_type
FROM users_clean
UNION ALL
SELECT -1                    AS customer_id,
       'Unknown'             AS firstname,
       'customer'            AS lastname,
       CAST(NULL AS varchar) AS email,
       CAST(NULL AS varchar) AS phone,
       CAST(NULL AS varchar) AS username,
       CAST(NULL AS integer) AS age,
       CAST(NULL AS varchar) AS gender,
       CAST(NULL AS varchar) AS address_street,
       CAST(NULL AS varchar) AS city,
       CAST(NULL AS varchar) AS state,
       CAST(NULL AS varchar) AS state_code,
       CAST(NULL AS varchar) AS postal_code,
       CAST(NULL AS varchar) AS country,
       CAST(NULL AS double)  AS latitude,
       CAST(NULL AS double)  AS longitude,
       CAST(NULL AS varchar) AS university,
       CAST(NULL AS varchar) AS company_name,
       CAST(NULL AS varchar) AS company_department,
       CAST(NULL AS varchar) AS company_title,
       CAST(NULL AS varchar) AS company_address_street,
       CAST(NULL AS varchar) AS company_address_city,
       CAST(NULL AS varchar) AS company_address_state,
       CAST(NULL AS varchar) AS company_address_state_code,
       CAST(NULL AS varchar) AS company_address_postal_code,
       CAST(NULL AS varchar) AS company_address_country,
       CAST(NULL AS double)  AS company_address_lat,
       CAST(NULL AS double)  AS company_address_lng,
       CAST(NULL AS varchar) AS "role",
       CAST(NULL AS varchar) AS source_ingestion_date,
       'Orphan'              AS customer_type
UNION ALL
SELECT -2                    AS customer_id,
       'Not'                 AS firstname,
       'recorded'            AS lastname,
       CAST(NULL AS varchar) AS email,
       CAST(NULL AS varchar) AS phone,
       CAST(NULL AS varchar) AS username,
       CAST(NULL AS integer) AS age,
       CAST(NULL AS varchar) AS gender,
       CAST(NULL AS varchar) AS address_street,
       CAST(NULL AS varchar) AS city,
       CAST(NULL AS varchar) AS state,
       CAST(NULL AS varchar) AS state_code,
       CAST(NULL AS varchar) AS postal_code,
       CAST(NULL AS varchar) AS country,
       CAST(NULL AS double)  AS latitude,
       CAST(NULL AS double)  AS longitude,
       CAST(NULL AS varchar) AS university,
       CAST(NULL AS varchar) AS company_name,
       CAST(NULL AS varchar) AS company_department,
       CAST(NULL AS varchar) AS company_title,
       CAST(NULL AS varchar) AS company_address_street,
       CAST(NULL AS varchar) AS company_address_city,
       CAST(NULL AS varchar) AS company_address_state,
       CAST(NULL AS varchar) AS company_address_state_code,
       CAST(NULL AS varchar) AS company_address_postal_code,
       CAST(NULL AS varchar) AS company_address_country,
       CAST(NULL AS double)  AS company_address_lat,
       CAST(NULL AS double)  AS company_address_lng,
       CAST(NULL AS varchar) AS "role",
       CAST(NULL AS varchar) AS source_ingestion_date,
       'Not recorded'        AS customer_type;

-- fact_ventes

CREATE TABLE fact_ventes
WITH (
    format              = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location   = 's3://${BUCKET}/gold/fact_ventes/',
    partitioned_by      = ARRAY['year', 'month']
) AS
SELECT
    ROW_NUMBER() OVER (
        ORDER BY o.invoice_timestamp, o.invoiceno, o.product_id
    )                                                     AS vente_id,
    o.invoiceno,
    CAST(date_format(o.invoice_date, '%Y%m%d') AS integer) AS date_id,
    COALESCE(p.product_id, -1)                            AS product_id,
    CASE
        WHEN o.customer_id IS NULL THEN -2
        WHEN c.customer_id IS NULL THEN -1
        ELSE o.customer_id
    END                                                   AS customer_id,
    o.country,
    o.is_return,
    o.quantity,
    o.unit_price,
    o.line_amount,
    o.invoice_timestamp,
    o.source_ingestion_date,
    o.year,
    o.month
FROM orders_clean o
LEFT JOIN dim_produit p ON p.product_id  = o.product_id
LEFT JOIN dim_client  c ON c.customer_id = o.customer_id;

-- Invariants

-- I1 - volume preserved

SELECT (SELECT COUNT(*) FROM orders_clean) AS silver,
       (SELECT COUNT(*) FROM fact_ventes)  AS gold;

-- I1b - natural key is unique

SELECT COUNT(*)                                                         AS rows,
       COUNT(DISTINCT invoiceno || '|' || CAST(product_id AS varchar)
                                || '|' || CAST(invoice_timestamp AS varchar))
                                                                        AS grains,
       COUNT(*) - COUNT(DISTINCT invoiceno || '|' || CAST(product_id AS varchar)
                                           || '|' || CAST(invoice_timestamp AS varchar))
                                                                        AS collisions
FROM fact_ventes;

-- I2 - no join fan-out

SELECT (SELECT COUNT(*) FROM fact_ventes) AS before_join,
       COUNT(*)                           AS after_join,
       ROUND(SUM(f.line_amount), 2)       AS revenue_after_join
FROM fact_ventes f
JOIN dim_date    d ON d.date_id     = f.date_id
JOIN dim_produit p ON p.product_id  = f.product_id
JOIN dim_client  c ON c.customer_id = f.customer_id;

-- I3 - primary keys are unique

SELECT 'dim_date' AS dim, COUNT(*) - COUNT(DISTINCT date_id) AS duplicates FROM dim_date
UNION ALL SELECT 'dim_produit', COUNT(*) - COUNT(DISTINCT product_id) FROM dim_produit
UNION ALL SELECT 'dim_client',  COUNT(*) - COUNT(DISTINCT customer_id) FROM dim_client;

-- I4 - no unhandled orphan key

SELECT COUNT_IF(d.date_id IS NULL)     AS facts_without_date,
       COUNT_IF(p.product_id IS NULL)  AS facts_without_product,
       COUNT_IF(c.customer_id IS NULL) AS facts_without_customer
FROM fact_ventes f
LEFT JOIN dim_date    d ON d.date_id     = f.date_id
LEFT JOIN dim_produit p ON p.product_id  = f.product_id
LEFT JOIN dim_client  c ON c.customer_id = f.customer_id;

-- I5 - convention rows are used

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

-- I6 - calendar is continuous

SELECT COUNT(*)                                             AS days,
       DATE_DIFF('day', MIN(full_date), MAX(full_date)) + 1 AS expected
FROM dim_date;
