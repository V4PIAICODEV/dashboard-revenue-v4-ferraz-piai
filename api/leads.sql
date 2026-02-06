create table public.leads (
  id bigint not null,
  name text null,
  price numeric null,
  responsible_user_id bigint null,
  group_id bigint null,
  status_id bigint null,
  pipeline_id bigint null,
  loss_reason_id bigint null,
  created_by bigint null,
  updated_by bigint null,
  created_at bigint null,
  updated_at bigint null,
  closed_at bigint null,
  closest_task_at bigint null,
  is_deleted boolean null,
  custom_fields_values jsonb null,
  score numeric null,
  account_id bigint null,
  labor_cost numeric null,
  is_price_computed boolean null,
  _embedded jsonb null,
  inserted_at timestamp with time zone null default now(),
  constraint leads_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_leads_custom_fields on public.leads using gin (custom_fields_values) TABLESPACE pg_default;