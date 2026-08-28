import { DocumentItem, User, VoteChoice, SystemStatus } from './types';

const API_BASE = 'http://localhost:8000';

export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const res = await fetch(`${API_BASE}/system/status`);
    if (!res.ok) return { status: 'offline', llm_connected: false };
    return res.json();
  } catch {
    return { status: 'offline', llm_connected: false };
  }
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function fetchDrafts(currentUserId: string): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE}/documents/drafts`, {
    headers: { 'X-User-Id': currentUserId },
  });
  if (!res.ok) throw new Error('Failed to fetch drafts');
  return res.json();
}

export async function fetchFeed(): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE}/documents/feed`);
  if (!res.ok) throw new Error('Failed to fetch feed');
  return res.json();
}

export async function fetchTrash(): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE}/documents/trash`);
  if (!res.ok) throw new Error('Failed to fetch trash');
  return res.json();
}

export async function fetchDocumentDetails(docId: string): Promise<DocumentItem> {
  const res = await fetch(`${API_BASE}/documents/${docId}`);
  if (!res.ok) throw new Error('Failed to fetch document details');
  return res.json();
}

export async function uploadDocument(
  currentUserId: string,
  title: string,
  agendaTopic: string,
  file?: File | null,
  rawText?: string
): Promise<{ document_id: string; status: string }> {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('agenda_topic', agendaTopic);
  if (file) {
    formData.append('file', file);
  }
  if (rawText) {
    formData.append('raw_text', rawText);
  }

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': currentUserId },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function ingestUrlDocument(
  currentUserId: string,
  agendaTopic: string,
  url: string,
  title?: string
): Promise<{ document_id: string; status: string; source_type: string }> {
  const res = await fetch(`${API_BASE}/documents/ingest-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': currentUserId,
    },
    body: JSON.stringify({
      title: title || undefined,
      agenda_topic: agendaTopic,
      url,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'URL ingestion failed');
  }
  return res.json();
}

export async function publishDocument(currentUserId: string, docId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}/publish`, {
    method: 'POST',
    headers: { 'X-User-Id': currentUserId },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Publish failed');
  }
  return res.json();
}

export async function triggerDelete(currentUserId: string, docId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}/delete`, {
    method: 'POST',
    headers: { 'X-User-Id': currentUserId },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Delete trigger failed');
  }
  return res.json();
}

export async function castVote(currentUserId: string, docId: string, choice: VoteChoice): Promise<any> {
  const formData = new FormData();
  formData.append('choice', choice);

  const res = await fetch(`${API_BASE}/documents/${docId}/vote`, {
    method: 'POST',
    headers: { 'X-User-Id': currentUserId },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Voting failed');
  }
  return res.json();
}
