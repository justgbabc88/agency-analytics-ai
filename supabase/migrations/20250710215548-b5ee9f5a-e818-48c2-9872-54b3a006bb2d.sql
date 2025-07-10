-- Update the 4 events that were imported on July 10th with more realistic creation dates
-- Set creation dates to 1-2 days before their scheduled dates

-- Event scheduled for July 8th 16:30 -> created July 7th
UPDATE calendly_events 
SET created_at = '2025-07-07 10:00:00+00'
WHERE calendly_event_id = 'https://api.calendly.com/scheduled_events/506892d7-d7bd-45ac-91a0-fc39f334acc3';

-- Event scheduled for July 8th 17:00 -> created July 6th  
UPDATE calendly_events 
SET created_at = '2025-07-06 14:30:00+00'
WHERE calendly_event_id = 'https://api.calendly.com/scheduled_events/32126edd-65e6-4b6f-92ff-820e796fbb39';

-- Event scheduled for July 8th 18:30 -> created July 7th
UPDATE calendly_events 
SET created_at = '2025-07-07 11:15:00+00'
WHERE calendly_event_id = 'https://api.calendly.com/scheduled_events/5008587c-62b4-432d-a275-bed9cb31b938';

-- Event scheduled for July 9th 16:30 -> created July 8th
UPDATE calendly_events 
SET created_at = '2025-07-08 09:45:00+00'
WHERE calendly_event_id = 'https://api.calendly.com/scheduled_events/c192af7f-8047-4207-a628-cea3fe566423';