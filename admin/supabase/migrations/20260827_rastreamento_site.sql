-- Identificadores públicos de mensuração. Nenhuma chave secreta deve ser salva aqui.
alter table public.site_configuracoes
  add column if not exists rastreamento_ativo boolean not null default false,
  add column if not exists consentimento_rastreamento_obrigatorio boolean not null default true,
  add column if not exists gtm_container_id text,
  add column if not exists ga4_measurement_id text,
  add column if not exists google_ads_id text,
  add column if not exists google_ads_conversion_label text,
  add column if not exists meta_pixel_id text;

comment on column public.site_configuracoes.gtm_container_id is 'Identificador público GTM-XXXX; use o GTM para tags adicionais.';
comment on column public.site_configuracoes.ga4_measurement_id is 'Identificador público GA4 G-XXXX.';
comment on column public.site_configuracoes.google_ads_id is 'Identificador público Google Ads AW-XXXX.';
comment on column public.site_configuracoes.meta_pixel_id is 'Identificador numérico público do Meta Pixel.';
