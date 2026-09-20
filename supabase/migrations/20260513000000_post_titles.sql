-- Add headline/title field to posts.
-- New posts always have a title (enforced by the app). Existing rows get
-- a default empty string so we don't break anything already inserted.

alter table public.posts
    add column if not exists title text not null default '';
alter table public.posts
    drop constraint if exists posts_title_length;
alter table public.posts
    add constraint posts_title_length check (length(title) <= 80);
-- Rebuild the feed_posts view so SELECTs include the new column.
-- `CREATE OR REPLACE VIEW` can't reorder columns in Postgres, so we drop first.
drop view if exists public.feed_posts;
create view public.feed_posts as
select
    p.id,
    p.author_id,
    pr.alias as author_alias,
    pr.streak_days as author_streak,
    p.title,
    p.body,
    p.like_count,
    p.reply_count,
    p.created_at
from public.posts p
join public.profiles pr on pr.id = p.author_id
where p.is_hidden = false
order by p.created_at desc;
grant select on public.feed_posts to authenticated, anon;
