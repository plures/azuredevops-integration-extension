// Sample Azure DevOps client with deliberate issues for testing knowledge base
import axios from 'axios';

class BuggyAzureClient {
  private pat: string;
  private baseUrl: string;

  constructor(organization: string, project: string, pat: string) {
    // Issue 1: Missing input validation
    this.pat = pat;
    this.baseUrl = `https://dev.azure.com/${organization}/${project}/_apis`;
  }

  async getWorkItems() {
    try {
      // Issue 2: No error handling for network failures
      // Issue 3: No rate limiting
      // Issue 4: Synchronous operation in async context
      const response = axios.get(`${this.baseUrl}/wit/workitems`, {
        headers: {
          Authorization: `Basic ${Buffer.from(':' + this.pat).toString('base64')}`,
        },
      });

      // Issue 5: No null checking
      return response.data.value;
    } catch (error) {
      // Issue 6: Poor error handling - swallowing errors
      console.log('Error occurred');
      return [];
    }
  }

  // Issue 7: Memory leak - no cleanup
  startPolling() {
    setInterval(() => {
      this.getWorkItems();
    }, 1000);
  }

  // Issue 8: No proper TypeScript types
  updateWorkItem(id, data) {
    // Issue 9: No input validation
    // Issue 10: Hardcoded API version
    return axios.patch(`${this.baseUrl}/wit/workitems/${id}?api-version=6.0`, data);
  }
}

// Issue 11: Export without proper module structure
module.exports = BuggyAzureClient;
