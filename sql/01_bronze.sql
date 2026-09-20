-- BRONZE - external tables over the raw files, exactly as delivered

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
  ingestion_date string
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES (
  'separatorChar' = ',',
  'quoteChar'     = '"'
)
STORED AS TEXTFILE
LOCATION 's3://${BUCKET}/bronze/orders/'
TBLPROPERTIES (
  'skip.header.line.count' = '1'
);
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
MSCK REPAIR TABLE orders_raw;
MSCK REPAIR TABLE products_raw;
MSCK REPAIR TABLE users_raw;

-- Verification

SELECT 'orders_raw' AS source, COUNT(*) AS rows, 7956 AS expected FROM orders_raw
UNION ALL SELECT 'products_raw', COUNT(*), 130 FROM products_raw
UNION ALL SELECT 'users_raw',    COUNT(*), 130 FROM users_raw
ORDER BY 1;
SELECT COUNT(*) AS header_leaked FROM orders_raw WHERE invoiceno = 'InvoiceNo';
SELECT
    COUNT(*)                                             AS total,
    COUNT_IF(quantity = '')                              AS quantity_blank,
    COUNT_IF(customerid = '')                            AS customer_blank,
    COUNT_IF(invoicedate = '')                           AS date_blank,
    COUNT_IF(invoicedate LIKE '%/%')                     AS date_wrong_format,
    COUNT_IF(TRY_CAST(unitprice AS double) <= 0)         AS price_zero_or_negative,
    COUNT_IF(invoiceno LIKE 'C%')                        AS returns
FROM orders_raw;
SELECT id, title, brand, dimensions.width, CARDINALITY(tags) AS tag_count
FROM products_raw LIMIT 3;
SELECT id, address.city, address.coordinates.lat, company.address.country
FROM users_raw LIMIT 3;
