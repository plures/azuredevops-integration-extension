/**
 * Azure Function: CRDT Sync
 */

import { syncEndpoint } from '../endpoints.js';

export default async function (context: any, req: any) {
  const response = await syncEndpoint(context, req);
  context.res = response;
}
