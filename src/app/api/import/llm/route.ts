import { NextRequest, NextResponse } from 'next/server';
import { parseLLMExport, conversationsToDocuments } from '@/lib/llm-import';
import { indexContent } from '@/lib/indexer';
import JSZip from 'jszip';

/**
 * POST /api/import/llm
 * Accepts a JSON file or ZIP containing JSON files from LLM exports.
 * Auto-detects the platform, parses conversations, and indexes them.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();

    // Determine if it's a ZIP or direct JSON
    let jsonData: unknown;

    if (fileName.endsWith('.zip')) {
      // Extract JSON from ZIP
      const zip = await JSZip.loadAsync(buffer);
      const jsonFiles: { name: string; data: unknown }[] = [];

      for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const lower = name.toLowerCase();
        if (lower.endsWith('.json')) {
          const content = await entry.async('string');
          try {
            jsonFiles.push({ name, data: JSON.parse(content) });
          } catch {
            console.warn(`Failed to parse JSON from ${name}`);
          }
        }
      }

      if (jsonFiles.length === 0) {
        return NextResponse.json(
          { error: 'No JSON files found in the ZIP archive' },
          { status: 400 },
        );
      }

      // Merge all JSON arrays (Gemini splits across files, ChatGPT/Claude have one file)
      const allConversations: unknown[] = [];
      for (const { data } of jsonFiles) {
        if (Array.isArray(data)) {
          allConversations.push(...data);
        }
      }

      if (allConversations.length === 0) {
        return NextResponse.json(
          { error: 'No conversation data found in the JSON files' },
          { status: 400 },
        );
      }

      jsonData = allConversations;
    } else if (fileName.endsWith('.json')) {
      // Direct JSON file
      const text = buffer.toString('utf-8');
      jsonData = JSON.parse(text);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JSON or ZIP file.' },
        { status: 400 },
      );
    }

    // Parse with auto-detection
    const { conversations, format } = parseLLMExport(jsonData);

    if (!format) {
      return NextResponse.json(
        {
          error:
            'Could not detect the export format. Supported formats: ChatGPT, Claude, Gemini.',
        },
        { status: 400 },
      );
    }

    if (conversations.length === 0) {
      return NextResponse.json(
        { error: 'No conversations found in the export data.' },
        { status: 400 },
      );
    }

    // Convert to documents and index
    const documents = conversationsToDocuments(conversations);
    const imported: { id: string; title: string }[] = [];
    const errors: { title: string; error: string }[] = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      try {
        // Generate unique virtual path
        const virtualPath = `llm-import://${format}/${doc.title.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 80)}-${Date.now()}-${i}.md`;
        const docId = await indexContent(virtualPath, doc);
        imported.push({ id: docId, title: doc.title });
      } catch (err) {
        errors.push({ title: doc.title, error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      format,
      total: conversations.length,
      imported: imported.length,
      errors: errors.length,
      importedList: imported,
      errorList: errors,
    });
  } catch (err) {
    console.error('LLM import error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * GET /api/import/llm — Returns format information and supported platforms.
 */
export async function GET() {
  return NextResponse.json({
    supported: ['chatgpt', 'claude', 'gemini'],
    instructions: {
      chatgpt: 'Settings → Data controls → Export data → Download ZIP',
      claude: 'Settings → Account → Export data → Download ZIP',
      gemini: 'Google Takeout → Select Gemini → Export → Download ZIP',
    },
    fileFormats: ['json', 'zip'],
  });
}