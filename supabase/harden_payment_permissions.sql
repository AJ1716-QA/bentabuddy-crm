-- BentaBuddy CRM: close inherited/public write grants on payment history.
-- Run in Supabase SQL Editor after secure_payment_status.sql.
-- This does not modify or delete existing payment/order records.
--
-- PUBLIC privileges are inherited by authenticated roles if they were ever granted.
-- Revoke write privileges from all three sources; the approved SECURITY DEFINER RPC
-- remains the only intended payment-writing path for signed-in sellers.

revoke insert, update, delete
on table public.order_payments
from public, anon, authenticated;

-- Keep payment history readable to signed-in users according to the existing RLS policies.
-- No SELECT grants or policies are changed.
