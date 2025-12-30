/**
 * Azure Function: Stats
 */

import { statsEndpoint } from '../endpoints.js';

export default async function (context: any, req: any) {
  const response = await statsEndpoint(context, req);
  context.res = response;
}
