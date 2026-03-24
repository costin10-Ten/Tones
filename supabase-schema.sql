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

-- ============================================================
-- 評論系統
-- ============================================================
create table if not exists comments (
  id           uuid default gen_random_uuid() primary key,
  story_slug   text not null,
  user_id      text not null,
  display_name text not null,
  content      text not null check (char_length(content) >= 1 and char_length(content) <= 500),
  created_at   timestamptz not null default now(),
  deleted      boolean not null default false
);
create index if not exists comments_slug_idx on comments (story_slug, created_at);
alter table comments enable row level security;

-- ============================================================
-- 電子報訂閱
-- ============================================================
create table if not exists email_subscribers (
  id         uuid default gen_random_uuid() primary key,
  email      text unique not null,
  created_at timestamptz not null default now()
);
alter table email_subscribers enable row level security;

-- ============================================================
-- 付費解鎖紀錄（paid 等級故事）
-- ============================================================
create table if not exists user_unlocks (
  user_id    text not null,
  story_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, story_slug)
);
alter table user_unlocks enable row level security;

-- ============================================================
-- 閱讀清單（登入用戶自訂書單，可分享）
-- ============================================================
create table if not exists reading_lists (
  id           uuid default gen_random_uuid() primary key,
  user_id      text not null,
  name         text not null check (char_length(name) >= 1 and char_length(name) <= 60),
  slugs        text[] not null default '{}',
  is_public    boolean not null default false,
  share_token  text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists reading_lists_user_idx on reading_lists (user_id);
alter table reading_lists enable row level security;

-- ============================================================
-- 線索系統（調查遊戲機制）
-- ============================================================

-- 線索發現紀錄（用戶閱讀故事後解鎖的線索）
create table if not exists clue_discoveries (
  clue_id       text not null,
  user_id       text not null,
  story_slug    text not null,
  discovered_at timestamptz not null default now(),
  primary key (clue_id, user_id)
);
create index if not exists clue_discoveries_user_idx on clue_discoveries (user_id);
alter table clue_discoveries enable row level security;

-- 假設推理進度（用戶對每個跨故事假設的置信度）
create table if not exists hypothesis_progress (
  hypothesis_id text not null,
  user_id       text not null,
  confidence    integer not null default 0 check (confidence >= 0 and confidence <= 100),
  status        text not null default 'locked' check (status in ('locked', 'partial', 'significant', 'confirmed')),
  updated_at    timestamptz not null default now(),
  primary key (hypothesis_id, user_id)
);
create index if not exists hypothesis_progress_user_idx on hypothesis_progress (user_id);
alter table hypothesis_progress enable row level security;

-- ============================================================
-- RLS Policies
-- 所有 API routes 使用 service_role key（繞過 RLS）
-- 以下 policy 用途：防止直接使用 anon key 存取敏感資料
-- ============================================================

-- story_stats：公開可讀（顯示瀏覽數），不允許 anon 寫入
create policy "story_stats_public_read"
  on story_stats for select using (true);

-- user_tokens：拒絕所有 anon 存取
create policy "user_tokens_deny_anon"
  on user_tokens using (false);

-- reading_progress：拒絕所有 anon 存取
create policy "reading_progress_deny_anon"
  on reading_progress using (false);

-- bookmarks：拒絕所有 anon 存取
create policy "bookmarks_deny_anon"
  on bookmarks using (false);

-- comments：允許公開讀取，拒絕 anon 寫入
create policy "comments_public_read"
  on comments for select using (true);
create policy "comments_deny_anon_write"
  on comments for insert with check (false);
create policy "comments_deny_anon_update"
  on comments for update using (false);
create policy "comments_deny_anon_delete"
  on comments for delete using (false);

-- email_subscribers：拒絕所有 anon 存取
create policy "email_subscribers_deny_anon"
  on email_subscribers using (false);

-- user_unlocks：拒絕所有 anon 存取
create policy "user_unlocks_deny_anon"
  on user_unlocks using (false);

-- reading_lists：公開清單可讀，拒絕 anon 寫入
create policy "reading_lists_public_read"
  on reading_lists for select using (is_public = true);
create policy "reading_lists_deny_anon_write"
  on reading_lists for insert with check (false);
create policy "reading_lists_deny_anon_update"
  on reading_lists for update using (false);
create policy "reading_lists_deny_anon_delete"
  on reading_lists for delete using (false);

-- clue_discoveries：拒絕所有 anon 存取
create policy "clue_discoveries_deny_anon"
  on clue_discoveries using (false);

-- hypothesis_progress：拒絕所有 anon 存取
create policy "hypothesis_progress_deny_anon"
  on hypothesis_progress using (false);
