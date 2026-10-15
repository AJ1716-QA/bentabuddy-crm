-- BentaBuddy CRM: atomic, owner-scoped manual payment recording.
-- Run this SQL in Supabase SQL Editor BEFORE changing app.js to call this RPC.
-- This does not delete or rewrite existing records and preserves the seller's manual workflow.

create or replace function public.record_manual_order_payment(
  p_business_id uuid,
  p_order_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_date timestamptz default now(),
  p_reference_number text default null,
  p_notes text default null
)
returns table (
  payment_id uuid,
  total_paid numeric,
  order_total numeric,
  payment_status text,
  order_status text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_payment_id uuid;
  v_order_total numeric;
  v_total_paid numeric;
  v_payment_status text;
  v_order_status text;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to record a payment.' using errcode = '42501';
  end if;

  if p_business_id is null or p_order_id is null then
    raise exception 'Business and order are required.' using errcode = '22004';
  end if;

  if not coalesce(private.owns_business(p_business_id), false)
     or not coalesce(private.has_crm_access(p_business_id), false) then
    raise exception 'You do not have access to this business.' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    raise exception 'Enter a valid payment amount greater than zero.' using errcode = '22023';
  end if;

  if p_payment_method is null or p_payment_method not in
     ('cash', 'gcash', 'maya', 'bank_transfer', 'cod', 'other') then
    raise exception 'Choose a valid payment method.' using errcode = '22023';
  end if;

  if p_payment_date is null then
    raise exception 'Payment date is required.' using errcode = '22004';
  end if;

  -- Lock the order so concurrent payments cannot calculate inconsistent balances.
  select o.total_amount, o.status
    into v_order_total, v_order_status
  from public.orders as o
  where o.id = p_order_id
    and o.business_id = p_business_id
  for update;

  if not found then
    raise exception 'Order not found for this business.' using errcode = 'P0002';
  end if;

  if v_order_total is null or v_order_total < 0 then
    raise exception 'This order has an invalid total.' using errcode = '22023';
  end if;

  insert into public.order_payments (
    business_id, order_id, amount, payment_method, payment_date,
    reference_number, notes
  )
  values (
    p_business_id, p_order_id, round(p_amount, 2), p_payment_method,
    p_payment_date, nullif(btrim(p_reference_number), ''),
    nullif(btrim(p_notes), '')
  )
  returning id into v_payment_id;

  select coalesce(sum(op.amount), 0)
    into v_total_paid
  from public.order_payments as op
  where op.business_id = p_business_id
    and op.order_id = p_order_id;

  v_payment_status := case
    when v_total_paid <= 0 then 'unpaid'
    when v_total_paid + 0.005 >= v_order_total then 'paid'
    else 'partial'
  end;

  update public.orders as o
  set payment_status = v_payment_status,
      status = case
        when v_payment_status = 'paid' and o.status in ('pending', 'confirmed')
          then 'processing'
        else o.status
      end,
      updated_at = now()
  where o.id = p_order_id
    and o.business_id = p_business_id
  returning o.status into v_order_status;

  return query select v_payment_id, v_total_paid, v_order_total,
                      v_payment_status, v_order_status;
end;
$function$;

revoke all on function public.record_manual_order_payment(
  uuid, uuid, numeric, text, timestamptz, text, text
) from public, anon;

grant execute on function public.record_manual_order_payment(
  uuid, uuid, numeric, text, timestamptz, text, text
) to authenticated;
