import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { ParsedDocument } from '@/types';

/**
 * Parse a markdown file. Extracts frontmatter (title, source) and body content.
 */
async function parseMarkdown(filePath: string): Promise<ParsedDocument> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const title = data.title || data.Title || path.basename(filePath, path.extname(filePath));
  const source = data.source || data.Source || data.model || data.Model || undefined;

  return {
    title: String(title),
    content: content.trim(),
    fileType: 'md',
    source,
  };
}

/**
 * Parse a PDF file. Extracts text using pdf-parse.
 */
async function parsePdf(filePath: string): Promise<ParsedDocument> {
  const pdfParseMod = await import('pdf-parse');
  // pdf-parse may export as ESM named or default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (pdfParseMod as any).default || pdfParseMod;
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);

  const filename = path.basename(filePath, path.extname(filePath));
  // Try to extract a title from the first line of text
  const firstLine = data.text.split('\n').find((l: string) => l.trim().length > 0);
  const title = firstLine ? firstLine.trim().slice(0, 100) : filename;

  return {
    title,
    content: data.text.trim(),
    fileType: 'pdf',
  };
}

/**
 * Parse a DOCX file. Extracts text using mammoth.
 */
async function parseDocx(filePath: string): Promise<ParsedDocument> {
  const mammoth = (await import('mammoth')).default;
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });

  const filename = path.basename(filePath, path.extname(filePath));
  // Use filename as title, or first line
  const firstLine = result.value.split('\n').find((l: string) => l.trim().length > 0);
  const title = firstLine ? firstLine.trim().slice(0, 100) : filename;

  return {
    title,
    content: result.value.trim(),
    fileType: 'docx',
  };
}

/**
 * Parse any supported file based on its extension.
 */
export async function parseFile(filePath: string): Promise<ParsedDocument> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.md':
    case '.markdown':
      return parseMarkdown(filePath);
    case '.pdf':
      return parsePdf(filePath);
    case '.docx':
      return parseDocx(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Detect the LLM source from content patterns.
 */
export function detectSource(content: string, filename: string): string | undefined {
  const combined = (content.slice(0, 500) + ' ' + filename).toLowerCase();

  if (combined.includes('claude') || combined.includes('anthropic')) return 'claude';
  if (combined.includes('chatgpt') || combined.includes('openai') || combined.includes('gpt')) return 'chatgpt';
  if (combined.includes('gemini') || combined.includes('google')) return 'gemini';

  return undefined;
}