'use strict';
// Where finished runs are sent (Supabase project → Settings → API).
// The publishable (anon) key is meant to be public; the table only allows adding and reading runs (supabase/schema.sql).
// Leave url empty to turn sending off for everyone.
const STATS_CONFIG = { url: 'https://vhwbnhgxrdcovsaitawp.supabase.co', key: 'sb_publishable_cIZAAoJcchgDcXqNNsp3Nw_7rMEeH-X' };
const GAME_BUILD = 48;
