#!/usr/bin/env node

/**
 * Diagnostic script to help troubleshoot work item fetching issues
 * This script tests various Azure DevOps API calls to identify the root cause
 */

import { AzureDevOpsIntClient } from '../dist/azureClient.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function diagnose() {
  console.log('Azure DevOps Work Items Diagnostic Tool');
  console.log('=====================================\n');

  // Read connection info from VS Code settings or environment
  let organization, project, pat;

  // Try to read from environment variables first
  organization = process.env.AZURE_DEVOPS_ORG;
  project = process.env.AZURE_DEVOPS_PROJECT;
  pat = process.env.AZURE_DEVOPS_PAT;

  if (!organization || !project || !pat) {
    console.log('Please set environment variables:');
    console.log('  AZURE_DEVOPS_ORG=your-org-name');
    console.log('  AZURE_DEVOPS_PROJECT=your-project-name');
    console.log('  AZURE_DEVOPS_PAT=your-personal-access-token\n');

    // Try to extract from logs if available
    try {
      const logsPath = join(__dirname, '..', 'src', 'Azure DevOps Integration Logs.txt');
      const logs = readFileSync(logsPath, 'utf8');
      const orgMatch = logs.match(/"organization":"([^"]+)"/);
      const projectMatch = logs.match(/"project":"([^"]+)"/);

      if (orgMatch && projectMatch) {
        organization = orgMatch[1];
        project = projectMatch[1];
        console.log(`Found from logs: ${organization}/${project}`);
        console.log('You still need to provide AZURE_DEVOPS_PAT environment variable\n');
      }
    } catch (e) {
      // Ignore if logs can't be read
    }

    if (!pat) {
      process.exit(1);
    }
  }

  console.log(`Testing connection to: ${organization}/${project}\n`);

  const client = new AzureDevOpsIntClient(organization, project, pat, {
    ratePerSecond: 1, // Slow down for diagnostics
    burst: 1,
  });

  // Test 1: Basic connectivity and authentication
  console.log('🔍 Test 1: Basic Authentication...');
  try {
    const identity = await client.getAuthenticatedUserId();
    console.log(`✅ Authentication successful. User ID: ${identity || 'unknown'}`);
  } catch (error) {
    console.log(`❌ Authentication failed: ${error.message}`);
    return;
  }

  // Test 2: Simple work item query
  console.log('\n🔍 Test 2: Simple Work Item Query...');
  try {
    const simpleQuery =
      'SELECT [System.Id], [System.Title] FROM WorkItems ORDER BY [System.Id] DESC';
    const simpleResults = await client.runWIQL(simpleQuery);
    console.log(`✅ Simple query returned ${simpleResults.length} work items`);

    if (simpleResults.length > 0) {
      console.log(
        `   Sample work item: #${simpleResults[0].id} - ${simpleResults[0].fields?.['System.Title'] || 'No title'}`
      );
    }
  } catch (error) {
    console.log(`❌ Simple query failed: ${error.message}`);
    return;
  }

  // Test 3: Default "My Activity" query
  console.log('\n🔍 Test 3: Default "My Activity" Query...');
  try {
    const myActivityResults = await client.getWorkItems('My Activity');
    console.log(`✅ "My Activity" query returned ${myActivityResults.length} work items`);

    if (myActivityResults.length > 0) {
      console.log(
        `   Sample work item: #${myActivityResults[0].id} - ${myActivityResults[0].fields?.['System.Title'] || 'No title'}`
      );
    } else {
      console.log(
        '   ℹ️  No work items in "My Activity" - this might be expected if you haven\'t created/modified work items recently'
      );
    }
  } catch (error) {
    console.log(`❌ "My Activity" query failed: ${error.message}`);
  }

  // Test 4: "All Active" query
  console.log('\n🔍 Test 4: "All Active" Query...');
  try {
    const allActiveResults = await client.getWorkItems('All Active');
    console.log(`✅ "All Active" query returned ${allActiveResults.length} work items`);

    if (allActiveResults.length > 0) {
      console.log(
        `   Sample work item: #${allActiveResults[0].id} - ${allActiveResults[0].fields?.['System.Title'] || 'No title'}`
      );
    }
  } catch (error) {
    console.log(`❌ "All Active" query failed: ${error.message}`);
  }

  // Test 5: Work item types
  console.log('\n🔍 Test 5: Work Item Types...');
  try {
    const workItemTypes = await client.getWorkItemTypes();
    console.log(`✅ Found ${workItemTypes.length} work item types:`);
    workItemTypes.forEach((type) => {
      console.log(`   - ${type.name || type}`);
    });
  } catch (error) {
    console.log(`❌ Failed to get work item types: ${error.message}`);
  }

  // Test 6: Team settings (if team is configured)
  console.log('\n🔍 Test 6: Team and Iterations...');
  try {
    const teams = await client.getTeams();
    console.log(`✅ Found ${teams.length} teams:`);
    teams.slice(0, 5).forEach((team) => {
      console.log(`   - ${team.name || team.id}`);
    });

    if (teams.length > 0) {
      try {
        const currentIteration = await client.getCurrentIteration();
        console.log(`✅ Current iteration: ${currentIteration?.name || 'None'}`);
      } catch (error) {
        console.log(`⚠️  Could not get current iteration: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Failed to get teams: ${error.message}`);
  }

  // Test 7: Custom WIQL with different state filters
  console.log('\n🔍 Test 7: Testing State Filters...');

  const testQueries = [
    {
      name: 'Using StateCategory',
      query: `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems 
                    WHERE [System.TeamProject] = @Project 
                    AND [System.StateCategory] <> 'Completed' 
                    AND [System.State] <> 'Removed'
                    ORDER BY [System.ChangedDate] DESC`,
    },
    {
      name: 'Legacy state filter',
      query: `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems 
                    WHERE [System.TeamProject] = @Project 
                    AND [System.State] NOT IN ('Closed','Done','Resolved','Removed')
                    ORDER BY [System.ChangedDate] DESC`,
    },
    {
      name: 'No state filter',
      query: `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems 
                    WHERE [System.TeamProject] = @Project 
                    ORDER BY [System.ChangedDate] DESC`,
    },
  ];

  for (const test of testQueries) {
    try {
      const results = await client.runWIQL(test.query);
      console.log(`✅ ${test.name}: ${results.length} work items`);
    } catch (error) {
      console.log(`❌ ${test.name} failed: ${error.message}`);
    }
  }

  console.log('\n🎯 Diagnosis Summary:');
  console.log('=====================');
  console.log("If all tests passed but you're still not seeing work items in VS Code:");
  console.log('1. Check if your PAT has "Work Items (Read)" permissions');
  console.log('2. Verify the connection configuration in VS Code settings');
  console.log('3. Try refreshing the work items view manually');
  console.log('4. Check the VS Code output channel "Azure DevOps Integration" for errors');
  console.log('\nIf some tests failed:');
  console.log('1. Verify your organization and project names are correct');
  console.log('2. Check if your PAT is valid and has not expired');
  console.log(
    '3. Ensure your PAT has sufficient permissions (Work Items Read, Project and Team Read)'
  );
  console.log('4. Try creating a new PAT with full access temporarily to test');
}

diagnose().catch((error) => {
  console.error('\n💥 Diagnostic script failed:', error.message);
  process.exit(1);
});
