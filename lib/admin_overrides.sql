-- Tabela para sobrescrever saldo/margem do usuário pelo admin
create table if not exists admin_overrides (
  user_id uuid primary key references profiles(id) on delete cascade,
  balance_override numeric,
  margin_override numeric,
  updated_at timestamptz default now()
);