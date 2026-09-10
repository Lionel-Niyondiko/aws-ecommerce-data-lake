-- ===========================================================================
-- BRONZE — external tables over the raw files, exactly as delivered
-- ===========================================================================
-- Bronze answers one question: what did the source send, and when?
--
-- EXTERNAL means the data belongs to S3, not to Athena: DROP TABLE removes the
-- definition, never the files. That, plus partitioning by ingestion date and
-- the fact that no CTAS ever writes here, is what makes bronze immutable by
-- construction rather than by discipline.
--
-- The CSV is typed entirely as STRING. Not laziness: one bad value makes a
-- strict type fail the WHOLE query (HIVE_BAD_DATA), and this file contains 29
-- dates of "31/02/2026". Typing is a judgement about the data; that judgement
-- belongs to silver, where TRY_CAST can count what it rejects.
--
-- The JSON files come from an application API with a code-enforced schema, so
-- native types are safe there. The asymmetry is deliberate.
--
-- Replace ${BUCKET} with the real bucket name (Athena does not interpolate).
-- ===========================================================================

CREATE EXTERNAL TABLE IF NOT EXISTS orders_raw (
  invoiceno   string,
  productid   string,
  quantity    string,
  invoicedate string,
  unitprice   string,
  customerid  string,
  country     string
)
PARTITIONED BY (
  ingestion_date string   -- technical date: when it ARRIVED, not when it sold
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES (
  'separatorChar' = ',',
  'quoteChar'     = '"'
)
STORED AS TEXTFILE
LOCATION 's3://${BUCKET}/bronze/orders/'
TBLPROPERTIES (
  -- Without this the header row becomes data and every COUNT is off by one.
  'skip.header.line.count' = '1'
);


-- Nested structures are kept as struct/array. Flattening is a transformation,
-- so it belongs to silver. brand is absent from 62 of 130 objects: the SerDe
-- returns NULL, which is correct.
CREATE EXTERNAL TABLE IF NOT EXISTS products_raw (
  id                   int,
  title                string,
  description          string,
  category             string,
  price                double,
  discountpercentage   double,
  rating               double,
  stock                int,
  tags                 array<string>,
  brand                string,
  sku                  string,
  weight               double,
  dimensions           struct<width:double, height:double, depth:double>,
  warrantyinformation  string,
  shippinginformation  string,
  availabilitystatus   string,
  minimumorderquantity int
)
PARTITIONED BY (ingestion_date string)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
WITH SERDEPROPERTIES ('ignore.malformed.json' = 'true')
LOCATION 's3://${BUCKET}/bronze/products/';


-- `role` is a reserved word: backticks in DDL, double quotes in SELECT.
-- Athena uses Hive for DDL and Trino for queries; they escape differently.
CREATE EXTERNAL TABLE IF NOT EXISTS users_raw (
  id         int,
  firstname  string,
  lastname   string,
  age        int,
  gender     string,
  email      string,
  phone      string,
  username   string,
  address    struct<
               address     : string,
               city        : string,
               state       : string,
               statecode   : string,
               postalcode  : string,
               coordinates : struct<lat:double, lng:double>,
               country     : string
             >,
  university string,
  company    struct<
               department : string,
               name       : string,
               title      : string,
               address    : struct<
                              address     : string,
                              city        : string,
                              state       : string,
                              statecode   : string,
                              postalcode  : string,
                              coordinates : struct<lat:double, lng:double>,
                              country     : string
                            >
             >,
  `role`     string
)
PARTITIONED BY (ingestion_date string)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
WITH SERDEPROPERTIES ('ignore.malformed.json' = 'true')
LOCATION 's3://${BUCKET}/bronze/users/';


-- A partitioned table only reads partitions registered in Glue. Files on S3
-- plus a created table plus zero rows means this step was skipped. It is the
-- single most common mistake in the lab.
MSCK REPAIR TABLE orders_raw;
MSCK REPAIR TABLE products_raw;
MSCK REPAIR TABLE users_raw;


-- ---------------------------------------------------------------------------
-- Verification: bronze must be faithful to the source
-- ---------------------------------------------------------------------------
-- Expected: 7956 / 130 / 130
SELECT 'orders_raw' AS source, COUNT(*) AS rows, 7956 AS expected FROM orders_raw
UNION ALL SELECT 'products_raw', COUNT(*), 130 FROM products_raw
UNION ALL SELECT 'users_raw',    COUNT(*), 130 FROM users_raw
ORDER BY 1;

-- Header correctly skipped? Expected 0.
SELECT COUNT(*) AS header_leaked FROM orders_raw WHERE invoiceno = 'InvoiceNo';

-- Nothing lost, nothing typed away. Expected:
-- 7956 | 116 | 157 | 36 | 29 | 74 | 243
SELECT
    COUNT(*)                                             AS total,
    COUNT_IF(quantity = '')                              AS quantity_blank,
    COUNT_IF(customerid = '')                            AS customer_blank,
    COUNT_IF(invoicedate = '')                           AS date_blank,
    COUNT_IF(invoicedate LIKE '%/%')                     AS date_wrong_format,
    COUNT_IF(TRY_CAST(unitprice AS double) <= 0)         AS price_zero_or_negative,
    COUNT_IF(invoiceno LIKE 'C%')                        AS returns
FROM orders_raw;

-- Nested typing works: dotted access reaches four levels deep.
SELECT id, title, brand, dimensions.width, CARDINALITY(tags) AS tag_count
FROM products_raw LIMIT 3;

SELECT id, address.city, address.coordinates.lat, company.address.country
FROM users_raw LIMIT 3;
