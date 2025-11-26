import { expect } from 'chai';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient.ts';

describe('AzureDevOpsIntClient work item types and states', () => {
  afterEach(() => nock.cleanAll());

  it('getWorkItemTypes returns list of work item types', async () => {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const mockWorkItemTypes = [
      { name: 'Task', description: 'Task work item type' },
      { name: 'Bug', description: 'Bug work item type' },
      { name: 'User Story', description: 'User Story work item type' },
    ];

    nock('https://dev.azure.com')
      .get('/org/proj/_apis/wit/workitemtypes?api-version=7.1')
      .reply(200, { value: mockWorkItemTypes });

    const types = await client.getWorkItemTypes();
    expect(types).to.have.length(3);
    expect(types[0]).to.have.property('name', 'Task');
    expect(types[1]).to.have.property('name', 'Bug');
    expect(types[2]).to.have.property('name', 'User Story');
  });

  it('getWorkItemTypes returns empty array on error', async () => {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');

    nock('https://dev.azure.com')
      .get('/org/proj/_apis/wit/workitemtypes?api-version=7.1')
      .reply(500, 'Internal Server Error');

    const types = await client.getWorkItemTypes();
    expect(types).to.be.an('array').that.is.empty;
  });

  it('getWorkItemTypeStates returns valid states for a work item type', async () => {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const mockStates = [{ name: 'New' }, { name: 'Active' }, { name: 'Closed' }];

    nock('https://dev.azure.com')
      .get('/org/proj/_apis/wit/workitemtypes/Task?api-version=7.1')
      .reply(200, { states: mockStates });

    const states = await client.getWorkItemTypeStates('Task');
    expect(states).to.have.length(3);
    expect(states).to.include('New');
    expect(states).to.include('Active');
    expect(states).to.include('Closed');
  });

  it('getWorkItemTypeStates handles special characters in work item type name', async () => {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const mockStates = [
      { name: 'New' },
      { name: 'Active' },
      { name: 'Resolved' },
      { name: 'Closed' },
    ];

    nock('https://dev.azure.com')
      .get('/org/proj/_apis/wit/workitemtypes/User%20Story?api-version=7.1')
      .reply(200, { states: mockStates });

    const states = await client.getWorkItemTypeStates('User Story');
    expect(states).to.have.length(4);
    expect(states).to.include('New');
    expect(states).to.include('Active');
    expect(states).to.include('Resolved');
    expect(states).to.include('Closed');
  });

  it('getWorkItemTypeStates returns empty array on error', async () => {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');

    nock('https://dev.azure.com')
      .get('/org/proj/_apis/wit/workitemtypes/InvalidType?api-version=7.1')
      .reply(404, 'Not Found');

    const states = await client.getWorkItemTypeStates('InvalidType');
    expect(states).to.be.an('array').that.is.empty;
  });

  it('getWorkItemTypeStates handles states as strings instead of objects', async () => {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const mockStatesAsStrings = ['New', 'Active', 'Closed'];

    nock('https://dev.azure.com')
      .get('/org/proj/_apis/wit/workitemtypes/Task?api-version=7.1')
      .reply(200, { states: mockStatesAsStrings });

    const states = await client.getWorkItemTypeStates('Task');
    expect(states).to.have.length(3);
    expect(states).to.include('New');
    expect(states).to.include('Active');
    expect(states).to.include('Closed');
  });
});
