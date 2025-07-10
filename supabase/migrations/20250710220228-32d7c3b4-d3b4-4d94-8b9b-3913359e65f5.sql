-- Delete events with artificial created_at timestamps so they can be re-synced with correct Calendly dates
DELETE FROM calendly_events 
WHERE calendly_event_id IN (
  'https://api.calendly.com/scheduled_events/506892d7-d7bd-45ac-91a0-fc39f334acc3',
  'https://api.calendly.com/scheduled_events/5008587c-62b4-432d-a275-bed9cb31b938', 
  'https://api.calendly.com/scheduled_events/32126edd-65e6-4b6f-92ff-820e796fbb39',
  'https://api.calendly.com/scheduled_events/c192af7f-8047-4207-a628-cea3fe566423'
);