// Supported: TXT, MD, DOCX, basic PDF text extraction

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'txt' || ext === 'md' || ext === 'csv') {
    return readAsText(file);
  }

  if (ext === 'docx') {
    return extractDocx(file);
  }

  if (ext === 'pdf') {
    return extractPdfBasic(file);
  }

  // Fallback: try reading as plain text
  try {
    return await readAsText(file);
  } catch {
    throw new Error(`不支持的文件格式：.${ext}。支持：TXT、MD、DOCX、PDF`);
  }
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'UTF-8');
  });
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractPdfBasic(file: File): Promise<string> {
  // Basic PDF text extraction — works for most text-based PDFs, not scanned
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let text = '';

  // Extract text strings from PDF byte stream (naive approach)
  const pdfStr = new TextDecoder('latin1').decode(bytes);
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(pdfStr)) !== null) {
    const content = match[1];
    // Extract text between parentheses (PDF Tj/TJ operators)
    const textRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let tm: RegExpExecArray | null;
    while ((tm = textRegex.exec(content)) !== null) {
      const t = tm[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')');
      if (t.trim().length > 1) text += t + ' ';
    }
  }

  if (!text.trim()) {
    throw new Error('PDF文本提取失败（可能是扫描件）。请将PDF内容复制为文本后粘贴，或转换为TXT格式上传。');
  }

  return text.trim();
}
