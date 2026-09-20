-- ReLust Community schema
-- Twitter-style feed: posts, one-level replies, likes.
-- Anonymous auth: each device gets an anonymous Supabase user.
-- Apple Guideline 1.2 compliance: report + block + auto-hide after 3 reports.

-- ============================================================
-- profiles  (one row per anonymous user)
-- ============================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    alias text not null check (length(alias) between 2 and 24),
    streak_days int not null default 0,
    is_banned boolean not null default false,
    created_at timestamptz not null default now()
);
create unique index if not exists profiles_alias_lower_idx
    on public.profiles (lower(alias));
alter table public.profiles enable row level security;
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
    for select using (true);
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
    for insert with check (auth.uid() = id);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
    for update using (auth.uid() = id);
-- ============================================================
-- posts  (top-level posts in the feed)
-- ============================================================
create table if not exists public.posts (
    id uuid primary key default gen_random_uuid(),
    author_id uuid not null references public.profiles(id) on delete cascade,
    body text not null check (length(body) between 1 and 500),
    like_count int not null default 0,
    reply_count int not null default 0,
    report_count int not null default 0,
    is_hidden boolean not null default false,
    created_at timestamptz not null default now()
);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_idx on public.posts (author_id);
alter table public.posts enable row level security;
-- Anyone authenticated can read non-hidden posts.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
    for select using (is_hidden = false);
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts
    for insert with check (
        auth.uid() = author_id
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = false)
    );
drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
    for delete using (auth.uid() = author_id);
-- ============================================================
-- replies  (one level deep, attached to a post)
-- ============================================================
create table if not exists public.replies (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts(id) on delete cascade,
    author_id uuid not null references public.profiles(id) on delete cascade,
    body text not null check (length(body) between 1 and 500),
    like_count int not null default 0,
    report_count int not null default 0,
    is_hidden boolean not null default false,
    created_at timestamptz not null default now()
);
create index if not exists replies_post_id_idx on public.replies (post_id, created_at);
alter table public.replies enable row level security;
drop policy if exists replies_select on public.replies;
create policy replies_select on public.replies
    for select using (is_hidden = false);
drop policy if exists replies_insert on public.replies;
create policy replies_insert on public.replies
    for insert with check (
        auth.uid() = author_id
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = false)
    );
drop policy if exists replies_delete_own on public.replies;
create policy replies_delete_own on public.replies
    for delete using (auth.uid() = author_id);
-- Keep post.reply_count in sync.
create or replace function public.bump_reply_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    if tg_op = 'INSERT' then
        update public.posts set reply_count = reply_count + 1 where id = new.post_id;
        return new;
    elsif tg_op = 'DELETE' then
        update public.posts set reply_count = greatest(reply_count - 1, 0) where id = old.post_id;
        return old;
    end if;
    return null;
end $$;
drop trigger if exists replies_count_trigger on public.replies;
create trigger replies_count_trigger
    after insert or delete on public.replies
    for each row execute function public.bump_reply_count();
-- ============================================================
-- likes  (one row per (user, target). target is post or reply)
-- ============================================================
create table if not exists public.likes (
    user_id uuid not null references public.profiles(id) on delete cascade,
    target_kind text not null check (target_kind in ('post','reply')),
    target_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (user_id, target_kind, target_id)
);
create index if not exists likes_target_idx on public.likes (target_kind, target_id);
alter table public.likes enable row level security;
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes
    for select using (true);
drop policy if exists likes_insert on public.likes;
create policy likes_insert on public.likes
    for insert with check (auth.uid() = user_id);
drop policy if exists likes_delete on public.likes;
create policy likes_delete on public.likes
    for delete using (auth.uid() = user_id);
-- Keep target like_count in sync.
create or replace function public.bump_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    if tg_op = 'INSERT' then
        if new.target_kind = 'post' then
            update public.posts set like_count = like_count + 1 where id = new.target_id;
        else
            update public.replies set like_count = like_count + 1 where id = new.target_id;
        end if;
        return new;
    elsif tg_op = 'DELETE' then
        if old.target_kind = 'post' then
            update public.posts set like_count = greatest(like_count - 1, 0) where id = old.target_id;
        else
            update public.replies set like_count = greatest(like_count - 1, 0) where id = old.target_id;
        end if;
        return old;
    end if;
    return null;
end $$;
drop trigger if exists likes_count_trigger on public.likes;
create trigger likes_count_trigger
    after insert or delete on public.likes
    for each row execute function public.bump_like_count();
-- ============================================================
-- reports  (Apple Guideline 1.2 compliance)
-- Auto-hide content once it crosses 3 reports.
-- ============================================================
create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.profiles(id) on delete cascade,
    target_kind text not null check (target_kind in ('post','reply')),
    target_id uuid not null,
    reason text,
    created_at timestamptz not null default now(),
    unique (reporter_id, target_kind, target_id)
);
create index if not exists reports_target_idx on public.reports (target_kind, target_id);
alter table public.reports enable row level security;
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
    for insert with check (auth.uid() = reporter_id);
-- Reports are private — only the reporter can see their own.
drop policy if exists reports_select_own on public.reports;
create policy reports_select_own on public.reports
    for select using (auth.uid() = reporter_id);
create or replace function public.handle_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare
    cnt int;
begin
    if new.target_kind = 'post' then
        update public.posts set report_count = report_count + 1 where id = new.target_id
            returning report_count into cnt;
        if cnt >= 3 then
            update public.posts set is_hidden = true where id = new.target_id;
        end if;
    else
        update public.replies set report_count = report_count + 1 where id = new.target_id
            returning report_count into cnt;
        if cnt >= 3 then
            update public.replies set is_hidden = true where id = new.target_id;
        end if;
    end if;
    return new;
end $$;
drop trigger if exists reports_trigger on public.reports;
create trigger reports_trigger
    after insert on public.reports
    for each row execute function public.handle_report();
-- ============================================================
-- blocks  (per-user blocklist; client filters in queries)
-- ============================================================
create table if not exists public.blocks (
    blocker_id uuid not null references public.profiles(id) on delete cascade,
    blocked_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists blocks_select_own on public.blocks;
create policy blocks_select_own on public.blocks
    for select using (auth.uid() = blocker_id);
drop policy if exists blocks_insert on public.blocks;
create policy blocks_insert on public.blocks
    for insert with check (auth.uid() = blocker_id);
drop policy if exists blocks_delete on public.blocks;
create policy blocks_delete on public.blocks
    for delete using (auth.uid() = blocker_id);
-- ============================================================
-- Feed view  (posts + author alias + streak, hidden filtered out)
-- Client joins blocks itself so RLS stays simple.
-- ============================================================
create or replace view public.feed_posts as
select
    p.id,
    p.author_id,
    pr.alias as author_alias,
    pr.streak_days as author_streak,
    p.body,
    p.like_count,
    p.reply_count,
    p.created_at
from public.posts p
join public.profiles pr on pr.id = p.author_id
where p.is_hidden = false
order by p.created_at desc;
create or replace view public.post_replies as
select
    r.id,
    r.post_id,
    r.author_id,
    pr.alias as author_alias,
    pr.streak_days as author_streak,
    r.body,
    r.like_count,
    r.created_at
from public.replies r
join public.profiles pr on pr.id = r.author_id
where r.is_hidden = false
order by r.created_at asc;
grant select on public.feed_posts to authenticated;
grant select on public.post_replies to authenticated;
