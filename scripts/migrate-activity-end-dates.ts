import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Calculate end date from start date and duration, skipping weekends
 */
function calculateEndDate(startDate: Date, durationDays: number): Date {
  const currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < durationDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return currentDate;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function migrateActivityEndDates() {
  console.log('🚀 Starting activity end_date migration...\n');

  // Fetch all activities with start_date and days_for_activity
  const { data: activities, error: fetchError } = await supabase
    .from('project_activities')
    .select('id, start_date, days_for_activity, end_date, name, project_id')
    .not('start_date', 'is', null)
    .not('days_for_activity', 'is', null);

  if (fetchError) {
    console.error('❌ Error fetching activities:', fetchError);
    process.exit(1);
  }

  if (!activities || activities.length === 0) {
    console.log('✅ No activities to migrate');
    return;
  }

  console.log(`📊 Found ${activities.length} activities to process\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each activity
  for (const activity of activities) {
    try {
      const startDate = new Date(activity.start_date);
      const calculatedEndDate = calculateEndDate(startDate, activity.days_for_activity);
      const formattedEndDate = formatDate(calculatedEndDate);

      // Check if end_date needs updating
      if (activity.end_date === formattedEndDate) {
        skippedCount++;
        continue;
      }

      // Update the activity
      const { error: updateError } = await supabase
        .from('project_activities')
        .update({ end_date: formattedEndDate })
        .eq('id', activity.id);

      if (updateError) {
        console.error(`❌ Error updating activity ${activity.id} (${activity.name}):`, updateError.message);
        errorCount++;
      } else {
        updatedCount++;
        if (updatedCount % 10 === 0) {
          console.log(`⏳ Updated ${updatedCount}/${activities.length} activities...`);
        }
      }
    } catch (err) {
      console.error(`❌ Error processing activity ${activity.id}:`, err);
      errorCount++;
    }
  }

  console.log('\n📈 Activity Migration Summary:');
  console.log(`   ✅ Updated: ${updatedCount}`);
  console.log(`   ⏭️  Skipped (already correct): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  return { updatedCount, skippedCount, errorCount };
}

async function syncAllPhases() {
  console.log('\n🔄 Syncing all phases with their activities...\n');

  // Get all phases
  const { data: phases, error: fetchError } = await supabase
    .from('project_phases')
    .select('id, phase_name, project_id');

  if (fetchError) {
    console.error('❌ Error fetching phases:', fetchError);
    process.exit(1);
  }

  if (!phases || phases.length === 0) {
    console.log('✅ No phases to sync');
    return;
  }

  console.log(`📊 Found ${phases.length} phases to sync\n`);

  let syncedCount = 0;
  let errorCount = 0;

  for (const phase of phases) {
    try {
      // Get all activities for this phase
      const { data: activities, error: activitiesError } = await supabase
        .from('project_activities')
        .select('sequence, start_date, end_date, days_for_activity, completion_percentage')
        .eq('phase_id', phase.id)
        .order('sequence', { ascending: true });

      if (activitiesError) {
        console.error(`❌ Error fetching activities for phase ${phase.id}:`, activitiesError.message);
        errorCount++;
        continue;
      }

      if (!activities || activities.length === 0) {
        // Phase with no activities - set to null
        const { error: updateError } = await supabase
          .from('project_phases')
          .update({
            start_date: null,
            end_date: null,
            progress_percentage: 0,
          })
          .eq('id', phase.id);

        if (updateError) {
          console.error(`❌ Error updating empty phase ${phase.id}:`, updateError.message);
          errorCount++;
        } else {
          syncedCount++;
        }
        continue;
      }

      // Calculate phase data from activities
      const sortedActivities = activities.sort((a, b) => a.sequence - b.sequence);
      const firstActivity = sortedActivities[0];
      const lastActivity = sortedActivities[sortedActivities.length - 1];

      const totalDays = activities.reduce((sum, a) => sum + (a.days_for_activity || 0), 0);
      const weightedCompletion = activities.reduce(
        (sum, a) => sum + ((a.completion_percentage || 0) * (a.days_for_activity || 0)) / 100,
        0
      );
      const progressPercentage = totalDays > 0 ? Math.round((weightedCompletion / totalDays) * 100) : 0;

      // Update phase
      const { error: updateError } = await supabase
        .from('project_phases')
        .update({
          start_date: firstActivity.start_date,
          end_date: lastActivity.end_date,
          progress_percentage: progressPercentage,
        })
        .eq('id', phase.id);

      if (updateError) {
        console.error(`❌ Error updating phase ${phase.id} (${phase.phase_name}):`, updateError.message);
        errorCount++;
      } else {
        syncedCount++;
        if (syncedCount % 10 === 0) {
          console.log(`⏳ Synced ${syncedCount}/${phases.length} phases...`);
        }
      }
    } catch (err) {
      console.error(`❌ Error processing phase ${phase.id}:`, err);
      errorCount++;
    }
  }

  console.log('\n📈 Phase Sync Summary:');
  console.log(`   ✅ Synced: ${syncedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  return { syncedCount, errorCount };
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Activity End Date Migration & Phase Sync  ║');
  console.log('╚════════════════════════════════════════════╝\n');

  try {
    // Step 1: Migrate activity end_dates
    const activityResults = await migrateActivityEndDates();

    // Step 2: Sync all phases
    const phaseResults = await syncAllPhases();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║            Migration Complete!             ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`  Activities updated: ${activityResults?.updatedCount || 0}`);
    console.log(`  Phases synced: ${phaseResults?.syncedCount || 0}`);
    console.log(`  Total errors: ${(activityResults?.errorCount || 0) + (phaseResults?.errorCount || 0)}\n`);

    if ((activityResults?.errorCount || 0) + (phaseResults?.errorCount || 0) > 0) {
      console.log('⚠️  Some errors occurred. Please review the logs above.');
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error('\n💥 Migration failed:', err);
    process.exit(1);
  }
}

main();
