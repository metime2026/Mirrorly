/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleVercelApi } from '../lib/api/vercel.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleVercelApi(req, res);
}

export const config = {
  maxDuration: 60,
};
