-- Reset user preference date_format so system defaults apply
update public.user_preferences
set date_format = null;
