-- BentaBuddy CRM: read-only verification of payment safeguards.
-- Run in Supabase SQL Editor after record_manual_order_payment.sql,
-- secure_payment_status.sql, and harden_payment_permissions.sql.
-- This query changes nothing and does not read or display customer/payment records.

select
  has_table_privilege('authenticated', 'public.order_payments', 'INSERT')
    as authenticated_can_insert_payment_directly,
  has_table_privilege('authenticated', 'public.order_payments', 'UPDATE')
    as authenticated_can_update_payment_directly,
  has_table_privilege('authenticated', 'public.order_payments', 'DELETE')
    as authenticated_can_delete_payment_directly,
  has_function_privilege(
    'authenticated',
    'public.record_manual_order_payment(uuid,uuid,numeric,text,timestamp with time zone,text,text)',
    'EXECUTE'
  ) as authenticated_can_use_secure_payment_function,
  exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'orders'
      and t.tgname = 'trg_prevent_unverified_payment_status_change'
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  ) as payment_status_guard_trigger_enabled,
  coalesce((
    select p.prosecdef
    from pg_catalog.pg_proc p
    where p.oid = pg_catalog.to_regprocedure(
      'public.record_manual_order_payment(uuid,uuid,numeric,text,timestamp with time zone,text,text)'
    )
  ), false) as secure_payment_function_is_security_definer;
