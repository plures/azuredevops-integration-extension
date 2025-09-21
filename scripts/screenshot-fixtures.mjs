/**
 * Generate realistic sample data for screenshot automation
 */

export function generateSampleWorkItems() {
  const workItemTypes = ['Task', 'Bug', 'User Story', 'Feature', 'Epic'];
  const states = ['New', 'Active', 'In Progress', 'Code Review', 'Done', 'Closed'];
  const priorities = [1, 2, 3, 4];
  const assignees = [
    'Alice Johnson',
    'Bob Smith',
    'Carol Davis',
    'David Wilson',
    'Emma Brown',
    'Unassigned',
  ];
  const sprints = ['Sprint 24', 'Sprint 25', 'Sprint 26'];
  const tags = ['frontend', 'backend', 'api', 'ui', 'performance', 'security', 'testing'];

  const sampleTitles = [
    'Implement user authentication flow',
    'Fix memory leak in data processing pipeline',
    'Add dark mode support to dashboard',
    'Optimize database query performance',
    'Create responsive mobile layout',
    'Integrate third-party payment gateway',
    'Update API documentation',
    'Implement real-time notifications',
    'Add unit tests for user service',
    'Refactor legacy code components',
    'Design new landing page',
    'Fix broken links in navigation',
    'Add search functionality',
    'Implement data export feature',
    'Update security headers configuration',
  ];

  const sampleDescriptions = [
    'Implement secure login and registration with multi-factor authentication support.',
    'Memory usage increases over time causing application slowdowns.',
    'Users have requested dark theme option for better accessibility.',
    'Current queries are taking too long to execute on large datasets.',
    'Ensure the interface works well on mobile devices and tablets.',
    'Integration with Stripe for processing customer payments.',
    'Update REST API documentation with latest endpoint changes.',
    'Real-time push notifications for important system events.',
    'Increase test coverage for critical user management functionality.',
    'Legacy components need modernization for better maintainability.',
    'Design and implement new marketing landing page.',
    'Several navigation links are returning 404 errors.',
    'Add global search across all content types.',
    'Allow users to export their data in CSV and JSON formats.',
    'Update HTTP security headers to meet latest standards.',
  ];

  const workItems = [];

  for (let i = 0; i < 15; i++) {
    const id = 1000 + i;
    const type = workItemTypes[Math.floor(Math.random() * workItemTypes.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const assignee = assignees[Math.floor(Math.random() * assignees.length)];
    const sprint = sprints[Math.floor(Math.random() * sprints.length)];
    const title = sampleTitles[i] || `Sample work item ${id}`;
    const description = sampleDescriptions[i] || `Description for work item ${id}`;

    // Random subset of tags
    const itemTags = [];
    const numTags = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numTags; j++) {
      const tag = tags[Math.floor(Math.random() * tags.length)];
      if (!itemTags.includes(tag)) {
        itemTags.push(tag);
      }
    }

    workItems.push({
      id,
      title,
      description,
      state,
      type,
      assignedTo: assignee === 'Unassigned' ? null : assignee,
      priority,
      tags: itemTags,
      iterationPath: `\\MyProject\\${sprint}`,
      // Additional fields that might be used
      fields: {
        'System.Id': id,
        'System.Title': title,
        'System.Description': description,
        'System.State': state,
        'System.WorkItemType': type,
        'System.AssignedTo': assignee === 'Unassigned' ? null : { displayName: assignee },
        'Microsoft.VSTS.Common.Priority': priority,
        'System.Tags': itemTags.join(';'),
        'System.IterationPath': `\\MyProject\\${sprint}`,
        'System.AreaPath': `\\MyProject\\Team${Math.floor(Math.random() * 3) + 1}`,
        'System.CreatedDate': new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        'System.ChangedDate': new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });
  }

  return workItems;
}

export function generateSampleTimer(workItems, workItemId = null) {
  if (!workItems || workItems.length === 0) return null;

  const targetId = workItemId || workItems[0].id;
  const workItem = workItems.find((item) => item.id === targetId) || workItems[0];

  return {
    workItemId: workItem.id,
    workItemTitle: workItem.title,
    elapsedSeconds: 3847, // 1 hour, 4 minutes, 7 seconds
    running: true,
  };
}

// Preset scenarios for different screenshot types
export const scenarios = {
  listView: {
    view: 'list',
    workItems: generateSampleWorkItems(),
    timer: null,
    selectWorkItemId: null,
  },

  listViewWithTimer: {
    view: 'list',
    workItems: generateSampleWorkItems(),
    get timer() {
      return generateSampleTimer(this.workItems, 1002);
    },
    selectWorkItemId: 1002,
  },

  kanbanView: {
    view: 'kanban',
    workItems: generateSampleWorkItems(),
    timer: null,
    selectWorkItemId: null,
  },

  kanbanViewWithTimer: {
    view: 'kanban',
    workItems: generateSampleWorkItems(),
    get timer() {
      return generateSampleTimer(this.workItems, 1004);
    },
    selectWorkItemId: 1004,
  },
};

export default {
  generateSampleWorkItems,
  generateSampleTimer,
  scenarios,
};
