-- 故事統計（全站累計瀏覽數 + 金幣數）
create table if not exists story_stats (
  story_slug  text primary key,
  views       integer not null default 0,
  tokens      integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- 用戶給金幣紀錄（避免同一人重複計算）
create table if not exists user_tokens (
  user_id     text not null,
  story_slug  text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, story_slug)
);

-- RLS（用 service_role 從 API routes 操作，不需要開放公開存取）
alter table story_stats enable row level security;
alter table user_tokens enable row level security;

-- 遞增瀏覽數（upsert）
create or replace function increment_view(p_slug text)
returns void language plpgsql as $$
begin
  insert into story_stats (story_slug, views)
    values (p_slug, 1)
  on conflict (story_slug)
    do update set views = story_stats.views + 1, updated_at = now();
end;
$$;

-- 遞增金幣數
create or replace function increment_token(p_slug text)
returns void language plpgsql as $$
begin
  insert into story_stats (story_slug, tokens)
    values (p_slug, 1)
  on conflict (story_slug)
    do update set tokens = story_stats.tokens + 1, updated_at = now();
end;
$$;

-- 遞減金幣數（不低於 0）
create or replace function decrement_token(p_slug text)
returns void language plpgsql as $$
begin
  update story_stats
    set tokens = greatest(0, tokens - 1), updated_at = now()
  where story_slug = p_slug;
end;
$$;

-- ============================================================
-- 聯繫作者留言
-- ============================================================
create table if not exists contact_messages (
  id         uuid default gen_random_uuid() primary key,
  user_id    text,                          -- nullable（未登入也可留言）
  message    text not null,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;
-- 任何人可寫入，只有 service_role 可讀取
create policy "Anyone can insert messages"
  on contact_messages for insert with check (true);

-- ============================================================
-- 閱讀進度（登入用戶跨裝置同步）
-- ============================================================
create table if not exists reading_progress (
  user_id    text not null,
  story_slug text not null,
  pct        integer not null default 0 check (pct >= 0 and pct <= 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, story_slug)
);

alter table reading_progress enable row level security;

-- ============================================================
-- 書籤（登入用戶）
-- ============================================================
create table if not exists bookmarks (
  user_id    text not null,
  story_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, story_slug)
);

alter table bookmarks enable row level security;
