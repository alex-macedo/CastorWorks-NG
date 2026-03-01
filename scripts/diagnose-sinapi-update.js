#!/usr/bin/env node
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

async function diagnoseSinapiUpdate() {
  try {
    await client.connect();
    console.log('Connected to database successfully\n');

    // 1. Check if we have any budgets with line items
    console.log('=== BUDGET LINE ITEMS ANALYSIS ===');
    const budgetCountQuery = 'SELECT COUNT(*) as count FROM public.budget_line_items';
    const budgetCountResult = await client.query(budgetCountQuery);
    console.log(`Total budget line items: ${budgetCountResult.rows[0].count}`);

    // Get sample budget IDs
    const budgetIdsQuery = 'SELECT DISTINCT budget_id FROM public.budget_line_items LIMIT 3';
    const budgetIdsResult = await client.query(budgetIdsQuery);
    console.log(`Sample budget IDs: ${budgetIdsResult.rows.map(r => r.budget_id).join(', ')}`);

    if (budgetIdsResult.rows.length === 0) {
      console.log('No budget line items found. Cannot proceed with analysis.');
      return;
    }

    const sampleBudgetId = budgetIdsResult.rows[0].budget_id;

    // 2. Check sample line items for the first budget
    console.log(`\n=== SAMPLE LINE ITEMS (budget: ${sampleBudgetId}) ===`);
    const sampleItemsQuery = `
      SELECT
        id,
        sinapi_code,
        description,
        unit_cost_material,
        unit_cost_labor,
        quantity
      FROM public.budget_line_items
      WHERE budget_id = $1
      LIMIT 10
    `;
    const sampleItemsResult = await client.query(sampleItemsQuery, [sampleBudgetId]);
    console.table(sampleItemsResult.rows);

    // 3. Check SINAPI items table
    console.log('\n=== SINAPI ITEMS ANALYSIS ===');
    const sinapiCountQuery = 'SELECT COUNT(*) as count FROM public.sinapi_items';
    const sinapiCountResult = await client.query(sinapiCountQuery);
    console.log(`Total SINAPI items: ${sinapiCountResult.rows[0].count}`);

    // Check distinct states and years
    const sinapiStatesQuery = `
      SELECT
        base_state,
        base_year,
        COUNT(*) as count
      FROM public.sinapi_items
      GROUP BY base_state, base_year
      ORDER BY base_state, base_year DESC
      LIMIT 10
    `;
    const sinapiStatesResult = await client.query(sinapiStatesQuery);
    console.log('SINAPI items by state/year:');
    console.table(sinapiStatesResult.rows);

    // 4. Test the lookup logic manually
    console.log('\n=== TESTING LOOKUP LOGIC ===');
    const sinapiCodes = sampleItemsResult.rows.map(r => r.sinapi_code).filter(code => code);
    
    if (sinapiCodes.length === 0) {
      console.log('No SINAPI codes found in sample items');
      return;
    }

    console.log(`Testing lookup for codes: ${sinapiCodes.join(', ')}`);

    for (const code of sinapiCodes.slice(0, 3)) { // Test first 3
      console.log(`\n--- Testing code: ${code} ---`);
      
      // First try SP state
      const spQuery = `
        SELECT
          sinapi_code,
          sinapi_description,
          sinapi_material_cost,
          sinapi_labor_cost,
          base_state,
          base_year
        FROM public.sinapi_items
        WHERE sinapi_code = $1
          AND base_state = 'SP'
        ORDER BY base_year DESC NULLS LAST
        LIMIT 1
      `;
      const spResult = await client.query(spQuery, [code]);
      
      if (spResult.rows.length > 0) {
        console.log('Found in SP state:');
        console.table(spResult.rows);
      } else {
        console.log('Not found in SP state, trying any state...');
        
        const anyStateQuery = `
          SELECT
            sinapi_code,
            sinapi_description,
            sinapi_material_cost,
            sinapi_labor_cost,
            base_state,
            base_year
          FROM public.sinapi_items
          WHERE sinapi_code = $1
          ORDER BY base_year DESC NULLS LAST, base_state
          LIMIT 1
        `;
        const anyStateResult = await client.query(anyStateQuery, [code]);
        
        if (anyStateResult.rows.length > 0) {
          console.log('Found in other state:');
          console.table(anyStateResult.rows);
        } else {
          console.log('NOT FOUND in any state!');
        }
      }
    }

    // 5. Test what the function would do
    console.log('\n=== SIMULATING FUNCTION EXECUTION ===');
    const simulateQuery = `
      SELECT
        bli.id,
        bli.sinapi_code,
        bli.unit_cost_material as current_material,
        bli.unit_cost_labor as current_labor,
        COALESCE(si.sinapi_material_cost, 0) as new_material,
        COALESCE(si.sinapi_labor_cost, 0) as new_labor,
        CASE 
          WHEN si.id IS NULL THEN 'NOT_FOUND'
          WHEN bli.unit_cost_material = COALESCE(si.sinapi_material_cost, 0) 
               AND bli.unit_cost_labor = COALESCE(si.sinapi_labor_cost, 0) THEN 'ALREADY_UPDATED'
          ELSE 'WOULD_UPDATE'
        END as action
      FROM public.budget_line_items bli
      LEFT JOIN public.sinapi_items si ON (
        si.sinapi_code = bli.sinapi_code
        AND si.base_state = 'SP'
        AND si.id = (
          SELECT si2.id
          FROM public.sinapi_items si2
          WHERE si2.sinapi_code = bli.sinapi_code
            AND si2.base_state = 'SP'
          ORDER BY si2.base_year DESC NULLS LAST
          LIMIT 1
        )
      )
      WHERE bli.budget_id = $1
        AND bli.sinapi_code IS NOT NULL
      LIMIT 20
    `;
    
    const simulateResult = await client.query(simulateQuery, [sampleBudgetId]);
    console.log('Function simulation results:');
    console.table(simulateResult.rows);

    // Summary
    const summary = simulateResult.rows.reduce((acc, row) => {
      acc[row.action] = (acc[row.action] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nSummary of what function would do:');
    console.log(`- Would update: ${summary.WOULD_UPDATE || 0}`);
    console.log(`- Already updated: ${summary.ALREADY_UPDATED || 0}`);
    console.log(`- Not found: ${summary.NOT_FOUND || 0}`);

  } catch (err) {
    console.error('Diagnostic failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

diagnoseSinapiUpdate();
