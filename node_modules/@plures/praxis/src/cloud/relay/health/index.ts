/**
 * Azure Function: Health Check
 */

import { healthEndpoint } from '../endpoints.js';

export default async function (context: any, req: any) {
  const response = await healthEndpoint(context, req);
  context.res = response;
}
