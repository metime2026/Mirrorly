/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ApiRequest, ApiResponse } from './context';
import { json } from './context';
import {
  handleAuthLogin,
  handleAuthLogout,
  handleAuthMe,
  handleCurrentUser,
  requireAuth,
} from './handlers/auth';
import * as entries from './handlers/entries';
import * as observation from './handlers/observation';
import * as chat from './handlers/chat';

export async function routeApi(req: ApiRequest): Promise<ApiResponse> {
  const route = req.path.join('/');
  const method = req.method.toUpperCase();

  try {
    if (route === 'auth/login' && method === 'POST') {
      return handleAuthLogin(req);
    }
    if (route === 'auth/logout' && method === 'POST') {
      const denied = await requireAuth(req);
      if (denied) return denied;
      return handleAuthLogout(req);
    }
    if (route === 'auth/me' && method === 'GET') {
      return handleAuthMe(req);
    }

    const denied = await requireAuth(req);
    if (denied) return denied;

    if (route === 'currentUser' && method === 'GET') {
      return handleCurrentUser(req);
    }
    if (route === 'entries' && method === 'GET') {
      return entries.handleListEntries(req);
    }
    if (route === 'entries' && method === 'POST') {
      return entries.handleCreateEntry(req);
    }
    if (req.path[0] === 'entries' && req.path.length === 2) {
      const id = req.path[1];
      if (method === 'GET') return entries.handleGetEntry(id);
      if (method === 'PUT') return entries.handleUpdateEntry(id, req);
      if (method === 'DELETE') return entries.handleDeleteEntry(id);
    }
    if (route === 'tags' && method === 'GET') {
      return entries.handleTags();
    }
    if (route === 'observation' && method === 'GET') {
      return observation.handleObservation(req);
    }
    if (route === 'observation/history' && method === 'GET') {
      return observation.handleObservationHistory();
    }
    if (route === 'chat' && method === 'GET') {
      return chat.handleGetChat();
    }
    if (route === 'chat' && method === 'POST') {
      return chat.handlePostChat(req);
    }
    if (route === 'chat/reset' && method === 'POST') {
      return chat.handleResetChat();
    }
    if (route === 'seed' && method === 'POST') {
      return entries.handleSeed();
    }
    if (route === 'clear' && method === 'POST') {
      return entries.handleClear();
    }

    return json({ error: 'Not Found', path: route }, 404);
  } catch (err: unknown) {
    console.error('API route error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return json({ error: message }, 500);
  }
}
