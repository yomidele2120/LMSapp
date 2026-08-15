import OpenAI from "openai";

/**
 * Every AI feature in the app calls through this interface, never the
 * OpenAI SDK directly — swapping providers (Anthropic, a local model, a
 * different OpenAI-compatible endpoint) means implementing this interface
 * once, not touching every call site. See getAiProvider() below for the
 * single place a new implementation gets wired in.
 */
export interface AiProvider {
  readonly name: string;
  complete(input: { system: string; prompt: string; maxTokens?: number }): Promise<{
    text: string;
    tokensUsed: number | null;
  }>;
  /** OCR via vision model rather than a dedicated OCR engine — no extra
   *  binary/service to deploy, and it's already good at scanned legal docs. */
  extractTextFromImage(input: { imageUrl: string }): Promise<{
    text: string;
    tokensUsed: number | null;
  }>;
  /** Scanned/image-based PDFs (no text layer) via the model's native PDF
   *  vision support — it rasterizes pages internally, so this needs no
   *  local PDF-to-image step (no `canvas`/native build to keep working on
   *  a serverless deploy). PDFs with a real text layer also work, and cost
   *  a lot less to eyeball this way than one API call per page. */
  extractTextFromPdf(input: { base64Pdf: string; filename: string }): Promise<{
    text: string;
    tokensUsed: number | null;
  }>;
}

class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o-mini") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async complete({ system, prompt, maxTokens = 800 }: { system: string; prompt: string; maxTokens?: number }) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });

    return {
      text: response.choices[0]?.message?.content ?? "",
      tokensUsed: response.usage?.total_tokens ?? null,
    };
  }

  async extractTextFromImage({ imageUrl }: { imageUrl: string }) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content:
            "Transcribe every word of readable text from this document image, in reading " +
            "order, exactly as it appears. Output plain text only — no commentary, no " +
            "markdown, no summary. If the image has no legible text, output nothing.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the text from this document image." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });

    return {
      text: response.choices[0]?.message?.content ?? "",
      tokensUsed: response.usage?.total_tokens ?? null,
    };
  }

  async extractTextFromPdf({ base64Pdf, filename }: { base64Pdf: string; filename: string }) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content:
            "Transcribe every word of readable text from this PDF, in reading order, " +
            "page by page, exactly as it appears — including pages that are scanned " +
            "images rather than a text layer. Output plain text only: no commentary, " +
            "no markdown, no summary. Separate pages with a blank line. If a page has " +
            "no legible text, skip it silently.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the text from this document." },
            {
              type: "file",
              file: { filename, file_data: `data:application/pdf;base64,${base64Pdf}` },
            },
          ],
        },
      ],
    });

    return {
      text: response.choices[0]?.message?.content ?? "",
      tokensUsed: response.usage?.total_tokens ?? null,
    };
  }
}

let cached: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cached) return cached;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local to enable AI features (see .env.example)."
    );
  }

  cached = new OpenAiProvider(apiKey);
  return cached;
}
