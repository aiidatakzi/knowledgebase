import type { ParsedDocument } from '@/types';

// Types for LLM export formats

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface LLMConversation {
  title: string;
  platform: 'chatgpt' | 'claude' | 'gemini';
  model?: string;
  messages: LLMMessage[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Auto-detect the export format by checking for telltale structural fields.
 */
export function detectExportFormat(
  data: unknown,
): 'chatgpt' | 'claude' | 'gemini' | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0] as Record<string, unknown>;

  // ChatGPT: conversations have a "mapping" field (tree structure)
  if (first.mapping && typeof first.mapping === 'object') {
    return 'chatgpt';
  }

  // Claude: conversations have "chat_messages" or "messages" with "sender"
  if (first.chat_messages || (first.messages && first.sender)) {
    return 'claude';
  }

  // Claude v2 alternative: uuid + name + chat_messages
  if (first.uuid && first.name && (first.chat_messages || first.messages)) {
    return 'claude';
  }

  // Gemini: conversations have "messages" array with "role" = "model" or "user"
  if (Array.isArray(first.messages)) {
    const msg = first.messages[0] as Record<string, unknown> | undefined;
    if (msg && (msg.role === 'model' || msg.role === 'user')) {
      return 'gemini';
    }
  }

  return null;
}

/**
 * Parse a ChatGPT conversations.json export.
 * The mapping is a tree; we traverse from root to reconstruct message order.
 */
export function parseChatGPTExport(data: unknown[]): LLMConversation[] {
  const conversations: LLMConversation[] = [];

  for (const conv of data) {
    const c = conv as Record<string, unknown>;
    const mapping = c.mapping as Record<string, Record<string, unknown>> | undefined;
    if (!mapping) continue;

    // Find the root node (has no parent field, or parent is null)
    let rootId: string | null = null;
    const parentMap = new Map<string, string | null>();

    for (const [nodeId, node] of Object.entries(mapping)) {
      const parent = node.parent as string | undefined;
      parentMap.set(nodeId, parent || null);
    }

    // Root is the node with no parent (or parent not in mapping)
    const parentEntries = Array.from(parentMap.entries());
    for (const [nodeId, parent] of parentEntries) {
      if (parent === null || !mapping[parent]) {
        rootId = nodeId;
        break;
      }
    }

    // Traverse from root following children to get ordered messages
    const messages: LLMMessage[] = [];
    let model: string | undefined;

    function traverse(nodeId: string): void {
      const node = mapping![nodeId];
      if (!node) return;

      if (node.message) {
        const msg = node.message as Record<string, unknown>;
        const author = msg.author as Record<string, unknown> | undefined;
        const content = msg.content as Record<string, unknown> | undefined;
        const metadata = msg.metadata as Record<string, unknown> | undefined;

        const role = (author?.role as string) || 'unknown';
        const parts = content?.parts as string[] | undefined;
        const text = parts ? parts.join('\n') : '';

        // Map system/user/assistant roles
        const mappedRole: LLMMessage['role'] =
          role === 'assistant'
            ? 'assistant'
            : role === 'system'
              ? 'system'
              : 'user';

        if (text.trim()) {
          messages.push({
            role: mappedRole,
            content: text,
            timestamp: msg.create_time
              ? new Date((msg.create_time as number) * 1000).toISOString()
              : undefined,
          });
        }

        // Extract model from assistant messages
        if (role === 'assistant' && metadata?.model_slug) {
          model = metadata.model_slug as string;
        }
      }

      // Follow children
      const children = node.children as string[] | undefined;
      if (children) {
        for (const childId of children) {
          traverse(childId);
        }
      }
    }

    if (rootId) traverse(rootId);

    if (messages.length > 0) {
      conversations.push({
        title: (c.title as string) || 'Untitled Conversation',
        platform: 'chatgpt',
        model,
        messages,
        createdAt: c.create_time
          ? new Date((c.create_time as number) * 1000).toISOString()
          : undefined,
        updatedAt: c.update_time
          ? new Date((c.update_time as number) * 1000).toISOString()
          : undefined,
      });
    }
  }

  return conversations;
}

/**
 * Parse a Claude conversations.json export.
 */
export function parseClaudeExport(data: unknown[]): LLMConversation[] {
  const conversations: LLMConversation[] = [];

  for (const conv of data) {
    const c = conv as Record<string, unknown>;
    const chatMessages =
      (c.chat_messages as unknown[]) || (c.messages as unknown[]) || [];

    const messages: LLMMessage[] = [];
    for (const msg of chatMessages) {
      const m = msg as Record<string, unknown>;
      const sender = (m.sender as string) || (m.role as string) || '';
      const text = (m.text as string) || (m.content as string) || '';

      const role: LLMMessage['role'] =
        sender === 'human' || sender === 'user'
          ? 'user'
          : 'assistant';

      if (text.trim()) {
        messages.push({
          role,
          content: text,
          timestamp: m.created_at
            ? new Date(m.created_at as string).toISOString()
            : undefined,
        });
      }
    }

    if (messages.length > 0) {
      conversations.push({
        title: (c.name as string) || (c.title as string) || 'Untitled Conversation',
        platform: 'claude',
        model: (c.model as string) || undefined,
        messages,
        createdAt: (c.created_at as string) || undefined,
        updatedAt: (c.updated_at as string) || undefined,
      });
    }
  }

  return conversations;
}

/**
 * Parse a Gemini Takeout JSON export.
 */
export function parseGeminiExport(data: unknown[]): LLMConversation[] {
  const conversations: LLMConversation[] = [];

  for (const conv of data) {
    const c = conv as Record<string, unknown>;
    const rawMessages = (c.messages as unknown[]) || [];

    const messages: LLMMessage[] = [];
    for (const msg of rawMessages) {
      const m = msg as Record<string, unknown>;
      const role = m.role as string;
      const content = (m.content as string) || '';

      const mappedRole: LLMMessage['role'] =
        role === 'model' ? 'assistant' : 'user';

      if (content.trim()) {
        messages.push({
          role: mappedRole,
          content,
        });
      }
    }

    if (messages.length > 0) {
      conversations.push({
        title: (c.title as string) || 'Untitled Conversation',
        platform: 'gemini',
        model: (c.model as string) || undefined,
        messages,
        createdAt: (c.createTime as string) || undefined,
      });
    }
  }

  return conversations;
}

/**
 * Parse any supported LLM export by auto-detecting the format.
 */
export function parseLLMExport(data: unknown): {
  conversations: LLMConversation[];
  format: 'chatgpt' | 'claude' | 'gemini' | null;
} {
  const format = detectExportFormat(data);

  let conversations: LLMConversation[] = [];
  if (format === 'chatgpt') {
    conversations = parseChatGPTExport(data as unknown[]);
  } else if (format === 'claude') {
    conversations = parseClaudeExport(data as unknown[]);
  } else if (format === 'gemini') {
    conversations = parseGeminiExport(data as unknown[]);
  }

  return { conversations, format };
}

/**
 * Convert an LLM conversation into a formatted markdown document.
 */
export function conversationToDocument(conv: LLMConversation): ParsedDocument & {
  model?: string;
  messageCount: number;
} {
  const lines: string[] = [];

  lines.push(`# ${conv.title}`);
  lines.push('');

  // Metadata header
  const meta: string[] = [];
  meta.push(`**Source:** ${conv.platform}`);
  if (conv.model) meta.push(`**Model:** ${conv.model}`);
  if (conv.createdAt) {
    meta.push(`**Date:** ${new Date(conv.createdAt).toLocaleDateString()}`);
  }
  meta.push(`**Messages:** ${conv.messages.length}`);
  lines.push(meta.join(' | '));
  lines.push('');
  lines.push('---');
  lines.push('');

  // Messages
  for (const msg of conv.messages) {
    const label =
      msg.role === 'user'
        ? '### You'
        : msg.role === 'system'
          ? '### System'
          : '### Assistant';

    lines.push(label);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
  }

  const content = lines.join('\n');

  return {
    title: conv.title,
    content,
    fileType: 'md',
    source: conv.platform,
    model: conv.model,
    messageCount: conv.messages.length,
  };
}

/**
 * Convert multiple conversations to documents.
 */
export function conversationsToDocuments(
  conversations: LLMConversation[],
): (ParsedDocument & { model?: string; messageCount: number })[] {
  return conversations.map(conversationToDocument);
}