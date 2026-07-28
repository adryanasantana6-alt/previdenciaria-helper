// Client-side text extraction for PDF, DOCX and plain text files.
import * as pdfjs from "pdfjs-dist";
// Vite bundles the worker as a URL asset.
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    out += text + "\n\n";
  }
  return out.trim();
}

export async function extractDocxText(file: File): Promise<string> {
  // @ts-expect-error - no bundled types for the browser entry
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return (res.value ?? "").trim();
}

export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfText(file);
  }
  if (name.endsWith(".docx")) {
    return extractDocxText(file);
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return (await file.text()).trim();
  }
  throw new Error(`Formato não suportado: ${file.name}. Use PDF, DOCX ou TXT.`);
}
