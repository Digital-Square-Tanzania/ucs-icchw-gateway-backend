-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS openmrs_location_hierarchy_view;

-- Create the new Materialized View
CREATE MATERIALIZED VIEW openmrs_location_hierarchy_view AS
WITH RECURSIVE location_tree AS (
    -- Base case: Top-level locations (Country level)
    SELECT
        l.location_id,
        l.uuid,
        l.name AS location_name,
        l.parent AS parent_uuid,
        l.type AS type,
        ARRAY[l.name] AS path_names,
        ARRAY[l.type] AS path_types
    FROM openmrs_location l
    WHERE l.type = 'Country' -- Root-level locations

    UNION ALL

    -- Recursive case: Join child locations to their parents
    SELECT
        child.location_id,
        child.uuid,
        child.name AS location_name,
        child.parent AS parent_uuid,
        child.type AS type,
        parent.path_names || child.name,
        parent.path_types || child.type
    FROM openmrs_location child
    JOIN location_tree parent ON child.parent = parent.uuid
)
SELECT
    ROW_NUMBER() OVER () AS index, -- Generate a unique index
    l.uuid,
    COALESCE(path_names[1], '') AS country,
    COALESCE(path_names[2], '') AS zone,
    COALESCE(path_names[3], '') AS region,
    COALESCE(path_names[4], '') AS district,
    COALESCE(path_names[5], '') AS council,
    COALESCE(path_names[6], '') AS ward,
    l.location_name AS name,
    l.type AS type
FROM location_tree l
WHERE l.type IN ('Country', 'Zone', 'Region', 'District', 'Council', 'Ward', 'Village', 'Facility'); 


