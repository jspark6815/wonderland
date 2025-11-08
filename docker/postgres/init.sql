-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create custom types
CREATE TYPE place_category AS ENUM (
  'RESTAURANT',
  'CAFE',
  'ACCOMMODATION',
  'SHOPPING',
  'CULTURE',
  'HEALTHCARE'
);

