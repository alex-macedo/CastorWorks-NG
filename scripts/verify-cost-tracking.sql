-- Verify Voice Transcription Cost Tracking
-- Run this in Supabase SQL Editor after testing

-- 1. Check recent voice transcription usage
SELECT 
  id,
  user_id,
  feature,
  model,
  total_cost,
  created_at
FROM ai_usage_logs
WHERE feature = 'voice_transcription'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verify no zero-cost records (should return 0 rows)
SELECT 
  id,
  total_cost,
  created_at
FROM ai_usage_logs
WHERE feature = 'voice_transcription'
  AND total_cost = 0;

-- 3. Compare with voice_transcriptions table (if estimateId was provided)
SELECT 
  vt.id,
  vt.duration_seconds,
  vt.estimate_id,
  al.total_cost,
  (vt.duration_seconds / 60.0 * 0.006) as expected_cost,
  ABS(al.total_cost - (vt.duration_seconds / 60.0 * 0.006)) as cost_difference
FROM voice_transcriptions vt
LEFT JOIN ai_usage_logs al ON 
  al.created_at BETWEEN vt.created_at - INTERVAL '1 second' 
  AND vt.created_at + INTERVAL '1 second'
WHERE al.feature = 'voice_transcription'
ORDER BY vt.created_at DESC
LIMIT 10;

-- 4. Cost statistics
SELECT 
  COUNT(*) as total_transcriptions,
  SUM(total_cost) as total_cost,
  AVG(total_cost) as avg_cost,
  MIN(total_cost) as min_cost,
  MAX(total_cost) as max_cost
FROM ai_usage_logs
WHERE feature = 'voice_transcription';

-- 5. Verify cost calculation accuracy
-- All costs should match: (duration / 60) * 0.006
SELECT 
  id,
  total_cost,
  CASE 
    WHEN total_cost = 0 THEN '❌ ZERO COST - BUG!'
    WHEN total_cost < 0.0001 THEN '⚠️ Very low cost (< $0.0001)'
    ELSE '✅ Valid cost'
  END as cost_status
FROM ai_usage_logs
WHERE feature = 'voice_transcription'
ORDER BY created_at DESC;

