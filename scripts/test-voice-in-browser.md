# Browser Testing Checklist

## Pre-Test Setup

- [ ] Edge Function deployed
- [ ] `OPENAI_API_KEY` secret configured in Supabase
- [ ] Development server running: `npm run dev`
- [ ] Browser has microphone permissions

## Test Steps

### 1. Navigate to Estimate Wizard
- [ ] Open app: http://localhost:5173 (or your dev URL)
- [ ] Click "AI Estimates" in sidebar
- [ ] Click "Create AI Estimate"
- [ ] Fill in project information
- [ ] Click "Next" to Description step

### 2. Test Voice Recording
- [ ] Click "Voice" tab
- [ ] Click "Start Recording" button
- [ ] Grant microphone permission if prompted
- [ ] Record 5-10 seconds of audio (speak clearly)
- [ ] Click "Stop" button
- [ ] Verify recording playback works
- [ ] Click "Use This Recording"

### 3. Verify Transcription
- [ ] Progress indicator appears (10% → 30% → 100%)
- [ ] Success toast appears with duration and confidence
- [ ] Transcription text appears in description field
- [ ] Text is prefixed with "[Voice Input]:"
- [ ] Can switch to "Text" tab to edit transcription

### 4. Test Edge Cases
- [ ] Record very short clip (< 1 second)
- [ ] Record longer clip (30+ seconds)
- [ ] Test pause/resume functionality
- [ ] Test re-recording after stopping

## Expected Results

### Success Indicators
✅ Recording starts immediately
✅ Timer counts up correctly
✅ Stop button works
✅ Transcription completes successfully
✅ Text appears in description field
✅ Success toast shows correct duration

### Error Handling
✅ Microphone permission denied → Shows error message
✅ Transcription fails → Shows error toast
✅ Network error → Shows error message

## Browser Console Checks

Open browser DevTools → Console and verify:
- [ ] No errors during recording
- [ ] No errors during transcription
- [ ] Network requests succeed (200 status)
- [ ] Edge Function called successfully

## Network Tab Checks

Open browser DevTools → Network and verify:
- [ ] Audio upload to Supabase Storage succeeds
- [ ] Edge Function invocation succeeds
- [ ] Response contains transcription text
- [ ] Response contains duration and confidence

---

**After testing, proceed to Step 3: Monitor Logs**

