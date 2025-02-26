-- Drop the existing regular view
DROP MATERIALIZED VIEW IF EXISTS location_hierarchy_view;
DROP TABLE IF EXISTS location_hierarchy_view;

-- Create as a Materialized View
CREATE MATERIALIZED VIEW location_hierarchy_view AS
WITH RECURSIVE location_tree AS (
    SELECT
        l.location_id,
        l.uuid,
        l.name AS location_name,
        l.parent_location,
        lt.name AS tag_name,
        ARRAY[l.name] AS path_names,
        ARRAY[lt.name] AS path_tags
    FROM location l
    JOIN location_tag_map ltm ON l.location_id = ltm.location_id
    JOIN location_tag lt ON ltm.location_tag_id = lt.location_tag_id
    WHERE lt.name = 'Country'

    UNION ALL

    SELECT
        child.location_id,
        child.uuid,
        child.name AS location_name,
        child.parent_location,
        child_tag.name AS tag_name,
        parent.path_names || child.name,
        parent.path_tags || child_tag.name
    FROM location child
    JOIN location_tag_map child_ltm ON child.location_id = child_ltm.location_id
    JOIN location_tag child_tag ON child_ltm.location_tag_id = child_tag.location_tag_id
    JOIN location_tree parent ON child.parent_location = parent.location_id
)
SELECT
    ROW_NUMBER() OVER () AS index,
    l.uuid,
    COALESCE(path_names[1], '') AS country,
    COALESCE(path_names[2], '') AS zone,
    COALESCE(path_names[3], '') AS region,
    COALESCE(path_names[4], '') AS district,
    COALESCE(path_names[5], '') AS council,
    COALESCE(path_names[6], '') AS ward,
    l.location_name AS name,
    l.tag_name AS type
FROM location_tree l
WHERE l.tag_name IN ('Village', 'Facility', 'Facility_msd_code', 'Testing Lab', 'Addo');
