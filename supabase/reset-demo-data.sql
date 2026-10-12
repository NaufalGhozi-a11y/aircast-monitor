-- Run this only if your Supabase database already contains the old test/demo clients.
-- It removes client monitoring data first, then removes all clients.
TRUNCATE TABLE client_events, client_aircast_images, client_containers, client_metrics, clients RESTART IDENTITY CASCADE;
