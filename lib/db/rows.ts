/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Neon serverless 查询结果的数组断言 */
export function asRows<T>(result: unknown): T[] {
  return result as T[];
}
