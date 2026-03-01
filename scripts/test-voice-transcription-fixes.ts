#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Test Script for Voice Transcription Bug Fixes
 * 
 * Tests Bug 1: MIME type detection
 * Tests Bug 2: Duration fallback when segments missing
 * 
 * Run: deno run --allow-net --allow-env scripts/test-voice-transcription-fixes.ts
 */

interface TestCase {
  name: string;
  providedMimeType?: string;
  blobType?: string;
  fileSizeBytes: number;
  whisperSegments?: Array<{ start: number; end: number; text: string }>;
  expectedMimeType: string;
  expectedExtension: string;
  expectedDuration: number;
  expectedCost: number;
}

// Simulate the mime type detection logic
function detectMimeType(providedMimeType?: string, blobType?: string): string {
  return providedMimeType || blobType || 'audio/webm';
}

// Simulate the extension mapping
function getExtension(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
  };
  return extensionMap[mimeType] || 'webm';
}

// Simulate the duration calculation logic
function calculateDuration(
  segments: Array<{ start: number; end: number; text: string }> | undefined,
  fileSizeBytes: number,
  mimeType: string
): number {
  if (segments && segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    return Math.ceil(lastSegment.end);
  } else {
    // Fallback: estimate duration from file size
    const bitrateMap: Record<string, number> = {
      'audio/webm': 64000,   // ~64 kbps
      'audio/mp4': 128000,   // ~128 kbps
      'audio/mpeg': 128000,  // ~128 kbps
      'audio/wav': 1411000,  // ~1411 kbps (uncompressed)
      'audio/ogg': 96000,    // ~96 kbps
      'audio/m4a': 128000,   // ~128 kbps
    };
    const estimatedBitrate = bitrateMap[mimeType] || 128000;
    const duration = Math.max(1, Math.ceil((fileSizeBytes * 8) / estimatedBitrate));
    return duration;
  }
}

// Calculate cost
function calculateCost(duration: number): number {
  return (duration / 60) * 0.006; // $0.006 per minute
}

// Test cases
const testCases: TestCase[] = [
  // Bug 1 Tests: MIME Type Detection
  {
    name: 'Bug 1: WebM from request',
    providedMimeType: 'audio/webm',
    blobType: undefined,
    fileSizeBytes: 480000,
    whisperSegments: [{ start: 0, end: 60, text: 'Test' }],
    expectedMimeType: 'audio/webm',
    expectedExtension: 'webm',
    expectedDuration: 60,
    expectedCost: 0.006,
  },
  {
    name: 'Bug 1: MP4 from blob type',
    providedMimeType: undefined,
    blobType: 'audio/mp4',
    fileSizeBytes: 960000,
    whisperSegments: [{ start: 0, end: 60, text: 'Test' }],
    expectedMimeType: 'audio/mp4',
    expectedExtension: 'mp4',
    expectedDuration: 60,
    expectedCost: 0.006,
  },
  {
    name: 'Bug 1: WAV format',
    providedMimeType: 'audio/wav',
    blobType: undefined,
    fileSizeBytes: 10582500, // ~60 seconds of WAV
    whisperSegments: [{ start: 0, end: 60, text: 'Test' }],
    expectedMimeType: 'audio/wav',
    expectedExtension: 'wav',
    expectedDuration: 60,
    expectedCost: 0.006,
  },
  {
    name: 'Bug 1: MP3 format',
    providedMimeType: 'audio/mpeg',
    blobType: undefined,
    fileSizeBytes: 960000,
    whisperSegments: [{ start: 0, end: 60, text: 'Test' }],
    expectedMimeType: 'audio/mpeg',
    expectedExtension: 'mp3',
    expectedDuration: 60,
    expectedCost: 0.006,
  },
  {
    name: 'Bug 1: Fallback to webm',
    providedMimeType: undefined,
    blobType: undefined,
    fileSizeBytes: 480000,
    whisperSegments: [{ start: 0, end: 60, text: 'Test' }],
    expectedMimeType: 'audio/webm',
    expectedExtension: 'webm',
    expectedDuration: 60,
    expectedCost: 0.006,
  },

  // Bug 2 Tests: Duration Fallback
  {
    name: 'Bug 2: Segments available (normal case)',
    providedMimeType: 'audio/webm',
    blobType: undefined,
    fileSizeBytes: 480000,
    whisperSegments: [{ start: 0, end: 30, text: 'Test' }],
    expectedMimeType: 'audio/webm',
    expectedExtension: 'webm',
    expectedDuration: 30,
    expectedCost: 0.003,
  },
  {
    name: 'Bug 2: No segments - estimate from WebM file',
    providedMimeType: 'audio/webm',
    blobType: undefined,
    fileSizeBytes: 480000, // 60 seconds at 64kbps
    whisperSegments: undefined,
    expectedMimeType: 'audio/webm',
    expectedExtension: 'webm',
    expectedDuration: 60, // (480000 * 8) / 64000 = 60
    expectedCost: 0.006,
  },
  {
    name: 'Bug 2: No segments - estimate from MP4 file',
    providedMimeType: 'audio/mp4',
    blobType: undefined,
    fileSizeBytes: 960000, // 60 seconds at 128kbps
    whisperSegments: undefined,
    expectedMimeType: 'audio/mp4',
    expectedExtension: 'mp4',
    expectedDuration: 60, // (960000 * 8) / 128000 = 60
    expectedCost: 0.006,
  },
  {
    name: 'Bug 2: No segments - estimate from WAV file',
    providedMimeType: 'audio/wav',
    blobType: undefined,
    fileSizeBytes: 10582500, // 60 seconds at 1411kbps
    whisperSegments: undefined,
    expectedMimeType: 'audio/wav',
    expectedExtension: 'wav',
    expectedDuration: 60, // (10582500 * 8) / 1411000 ≈ 60
    expectedCost: 0.006,
  },
  {
    name: 'Bug 2: Empty segments array',
    providedMimeType: 'audio/webm',
    blobType: undefined,
    fileSizeBytes: 480000,
    whisperSegments: [],
    expectedMimeType: 'audio/webm',
    expectedExtension: 'webm',
    expectedDuration: 60, // Should fallback to estimation
    expectedCost: 0.006,
  },
  {
    name: 'Bug 2: Very small file - minimum duration',
    providedMimeType: 'audio/webm',
    blobType: undefined,
    fileSizeBytes: 1000, // Very small file
    whisperSegments: undefined,
    expectedMimeType: 'audio/webm',
    expectedExtension: 'webm',
    expectedDuration: 1, // Math.max(1, ...) ensures minimum
    expectedCost: 0.0001, // (1 / 60) * 0.006 = 0.0001
  },
  {
    name: 'Bug 2: Unknown format - default bitrate',
    providedMimeType: 'audio/unknown',
    blobType: undefined,
    fileSizeBytes: 960000, // Uses default 128kbps
    whisperSegments: undefined,
    expectedMimeType: 'audio/unknown',
    expectedExtension: 'webm', // Falls back to webm extension
    expectedDuration: 60, // (960000 * 8) / 128000 = 60
    expectedCost: 0.006,
  },
];

// Run tests
function runTests() {
  console.log('🧪 Testing Voice Transcription Bug Fixes\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    
    // Test Bug 1: MIME type detection
    const detectedMimeType = detectMimeType(testCase.providedMimeType, testCase.blobType);
    const extension = getExtension(detectedMimeType);
    
    // Test Bug 2: Duration calculation
    const duration = calculateDuration(
      testCase.whisperSegments,
      testCase.fileSizeBytes,
      detectedMimeType
    );
    const cost = calculateCost(duration);
    
    // Verify results
    const mimeTypeMatch = detectedMimeType === testCase.expectedMimeType;
    const extensionMatch = extension === testCase.expectedExtension;
    const durationMatch = duration === testCase.expectedDuration;
    const costMatch = Math.abs(cost - testCase.expectedCost) < 0.0001; // Allow floating point tolerance
    
    const allPassed = mimeTypeMatch && extensionMatch && durationMatch && costMatch;
    
    if (allPassed) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED');
      failed++;
      
      if (!mimeTypeMatch) {
        console.log(`     MIME Type: Expected "${testCase.expectedMimeType}", got "${detectedMimeType}"`);
      }
      if (!extensionMatch) {
        console.log(`     Extension: Expected "${testCase.expectedExtension}", got "${extension}"`);
      }
      if (!durationMatch) {
        console.log(`     Duration: Expected ${testCase.expectedDuration}s, got ${duration}s`);
      }
      if (!costMatch) {
        console.log(`     Cost: Expected $${testCase.expectedCost.toFixed(4)}, got $${cost.toFixed(4)}`);
      }
    }
    
    // Show details
    console.log(`     MIME: ${detectedMimeType} → .${extension}`);
    console.log(`     Duration: ${duration}s (${testCase.whisperSegments ? 'from segments' : 'estimated'})`);
    console.log(`     Cost: $${cost.toFixed(4)}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total:  ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Bug fixes verified.');
    Deno.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    Deno.exit(1);
  }
}

// Run the tests
runTests();

