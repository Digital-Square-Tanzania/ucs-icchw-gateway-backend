INSERT INTO openmrs_location_tag (location_tag_id, name, description, creator, date_created, retired, retired_by, date_retired, retire_reason, uuid, changed_by, date_changed)
VALUES
  (1, 'Country', 'Country', 1, '2020-08-09 08:40:12', FALSE, NULL, NULL, NULL, '373988ef-2db8-4733-ae10-144381d432b1', NULL, NULL),
  (2, 'Zone', 'Zone', 1, '2020-08-09 08:40:25', FALSE, NULL, NULL, NULL, '92a2fcf4-78e5-4f10-b620-2ca6bc82a2f0', NULL, NULL),
  (3, 'Region', 'Region', 1, '2020-08-09 08:40:35', FALSE, NULL, NULL, NULL, 'f92694a0-1acf-4bf4-be8f-07133a0eea26', NULL, NULL),
  (4, 'Council', 'Council', 1, '2020-08-09 08:40:45', FALSE, NULL, NULL, NULL, '177dbf97-7473-4ed0-bcc5-7d4636095225', NULL, NULL),
  (5, 'Facility', 'Facility', 1, '2020-08-09 08:40:55', FALSE, NULL, NULL, NULL, '847cc7aa-b444-4fe1-ae80-7cc1abeb6a36', 1, '2020-08-09 09:05:49'),
  (6, 'Village', 'Village', 1, '2020-08-09 08:41:06', FALSE, NULL, NULL, NULL, '9d3a9961-80db-4f54-baad-f8d328c182f7', NULL, NULL),
  (7, 'Ward', 'Ward', 1, '2020-08-09 14:40:56', FALSE, NULL, NULL, NULL, '44d40613-315d-438a-bc52-648c81d4b46e', NULL, NULL),
  (8, 'District', 'District', 1, '2022-02-10 18:24:46', FALSE, NULL, NULL, NULL, '657f1004-73ad-4887-9c69-30be75e6eff0', 1, '2022-02-10 18:24:59'),
  (9, 'Facility_msd_code', 'Facilities with MSD codes', 1, '2023-04-04 13:39:56', FALSE, NULL, NULL, NULL, 'dec6231a-bcfe-4ebb-ab2f-2d9b27c2d814', NULL, NULL),
  (10, 'Addo', 'Addo', 1, '2024-03-13 13:58:50', FALSE, NULL, NULL, NULL, '1c2ed74b-3f3c-4332-a829-05f018e10e7c', NULL, NULL),
  (11, 'Testing Lab', 'Testing Lab', 1, '2024-04-13 09:39:36', FALSE, NULL, NULL, NULL, 'fbfec3c6-f45b-4cd1-9a50-dea984e0504a', NULL, NULL)
ON CONFLICT DO NOTHING;