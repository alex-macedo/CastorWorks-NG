create schema if not exists metrics;

drop view if exists metrics.feedback_response_aggregate;

create view metrics.feedback_response_aggregate
as select
  count(*) filter (where vote = 'up') as yes,
  count(*) filter (where vote = 'down') as no
from feedback;
