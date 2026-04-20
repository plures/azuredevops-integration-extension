/**
 * Azure Function: Usage Metrics
 */

import { usageEndpoint } from '../endpoints.js';

export default async function (context: any, req: any) {
  const response = await usageEndpoint(context, req);
  context.res = response;
}
