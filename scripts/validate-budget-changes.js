#!/usr/bin/env node

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

const BUDGET_ID = 'b1a229a5-8ed8-41a1-82f2-134369e9a613';
const PROJECT_ID = 'c3560338-fd67-4f27-a5a2-22b26a08ca0b';

async function validateBudgetChanges() {
  try {
    await client.connect();
    console.log('🔍 Validating Budget Changes for:');
    console.log(`   Budget ID: ${BUDGET_ID}`);
    console.log(`   Project ID: ${PROJECT_ID}`);
    console.log('');

    // 1. Check current budget line items count
    console.log('📊 CURRENT BUDGET STATUS:');
    const currentCountQuery = `
      SELECT COUNT(*) as current_items,
             COUNT(CASE WHEN unit_cost_material = 0 AND unit_cost_labor = 0 THEN 1 END) as zero_cost_items,
             COUNT(CASE WHEN unit_cost_material > 0 OR unit_cost_labor > 0 THEN 1 END) as positive_cost_items
      FROM public.budget_line_items
      WHERE budget_id = $1
    `;
    const currentResult = await client.query(currentCountQuery, [BUDGET_ID]);
    const current = currentResult.rows[0];

    console.log(`   Current budget items: ${current.current_items}`);
    console.log(`   Items with zero costs: ${current.zero_cost_items}`);
    console.log(`   Items with positive costs: ${current.positive_cost_items}`);
    console.log('');

    // 2. Run debug analysis
    console.log('🔬 TEMPLATE ANALYSIS (What WOULD be included):');
    const debugQuery = `
      SELECT action, COUNT(*) as count
      FROM public.debug_budget_population($1, $2)
      GROUP BY action
      ORDER BY count DESC
    `;
    const debugResult = await client.query(debugQuery, [BUDGET_ID, PROJECT_ID]);

    console.log('   Debug results:');
    let totalWouldInclude = 0;
    let totalWouldSkip = 0;

    debugResult.rows.forEach(row => {
      console.log(`   ${row.action}: ${row.count} items`);
      if (row.action === 'INCLUDED') totalWouldInclude = parseInt(row.count);
      if (row.action === 'SKIPPED') totalWouldSkip = parseInt(row.count);
    });

    console.log('');
    console.log('📈 SUMMARY:');
    console.log(`   Template items: ${totalWouldInclude + totalWouldSkip}`);
    console.log(`   Would be included: ${totalWouldInclude}`);
    console.log(`   Would be skipped: ${totalWouldSkip}`);
    console.log(`   Expected range: ${totalWouldInclude} items (vs previous ~400-450)`);
    console.log('');

    // 3. Check for items that would be included but aren't in current budget
    if (current.current_items < totalWouldInclude) {
      console.log('⚠️  POTENTIAL ISSUE: Current budget has fewer items than expected');
      console.log(`   Missing items: ${totalWouldInclude - current.current_items}`);
      console.log('');

      // Show what would be included vs what's currently there
      const missingQuery = `
        SELECT
          d.item_number,
          d.sinapi_code,
          d.phase_name,
          d.material_cost,
          d.labor_cost
        FROM public.debug_budget_population($1, $2) d
        WHERE d.action = 'INCLUDED'
        AND NOT EXISTS (
          SELECT 1 FROM public.budget_line_items bli
          WHERE bli.budget_id = $1
            AND bli.sinapi_code = d.sinapi_code
            AND bli.item_number = d.item_number
        )
        ORDER BY d.phase_name, d.item_number
        LIMIT 10
      `;
      const missingResult = await client.query(missingQuery, [BUDGET_ID, PROJECT_ID]);

      if (missingResult.rows.length > 0) {
        console.log('🔍 SAMPLE MISSING ITEMS (first 10):');
        missingResult.rows.forEach((row, i) => {
          console.log(`   ${i + 1}. ${row.item_number} (${row.sinapi_code}) - ${row.phase_name}`);
          console.log(`      Costs: Material=${row.material_cost || 0}, Labor=${row.labor_cost || 0}`);
        });
        console.log(`   ... and ${totalWouldInclude - current.current_items - 10} more`);
      }
    } else if (current.current_items === totalWouldInclude) {
      console.log('✅ BUDGET IS COMPLETE: Current items match expected count');
    } else {
      console.log('🤔 UNEXPECTED: Current budget has MORE items than expected');
      console.log('   This might indicate the budget was created with different logic');
    }

    // 4. Recommendations
    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    if (current.current_items < totalWouldInclude) {
      console.log('   1. Recreate the budget to get all template items');
      console.log('   2. Or run this to add missing items:');
      console.log(`      SELECT public.populate_budget_from_template('${BUDGET_ID}', '${PROJECT_ID}');`);
      console.log('   3. The relaxed validation should now include zero-cost items');
    } else {
      console.log('   ✅ Budget appears to be complete with relaxed validation');
    }

  } catch (err) {
    console.error('❌ Validation failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

validateBudgetChanges();