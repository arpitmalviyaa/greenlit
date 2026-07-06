// Canonical AI output standard (Phase 0.3):
// provider-level structured output via forced tool use, zod validation,
// one bounded repair retry, stable error codes, telemetry logging.
// Never logs contract/document text.

import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

export type AIErrorCode = "AI_REQUEST_FAILED" | "AI_INVALID_OUTPUT";

export class AIOutputError extends Error {
  readonly code: AIErrorCode;
  constructor(code: AIErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AIOutputError";
    this.code = code;
  }
}

interface StructuredCallOptions<T> {
  feature: string; // e.g. "counsel.redflags"
  promptVersion: string; // e.g. "v2"
  model: string;
  maxTokens: number;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  toolName?: string;
}

function logAICall(entry: Record<string, unknown>) {
  // Structured telemetry only — model, versions, status, latency, tokens.
  console.log(JSON.stringify({ tag: "ai_call", ...entry }));
}

// Pure validator, exported for fixture-based regression tests.
export function validateStructured<T>(schema: z.ZodType<T>, input: unknown):
  | { success: true; data: T }
  | { success: false; issues: string } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  const issues = parsed.error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { success: false, issues };
}

export async function callStructured<T>(opts: StructuredCallOptions<T>): Promise<T> {
  // Lazy import keeps this module loadable in offline tests (no SDK/env needed).
  const { getAnthropicClient } = await import("./client.ts");
  const anthropic = getAnthropicClient();
  const toolName = opts.toolName ?? "emit_result";
  const tool = {
    name: toolName,
    description: "Emit the structured result. Always call this tool.",
    input_schema: z.toJSONSchema(opts.schema) as Record<string, unknown>,
  };

  let lastIssues = "";
  const MAX_ATTEMPTS = 2; // initial + one repair retry

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const userContent =
      attempt === 1
        ? opts.user
        : `${opts.user}\n\nYour previous response failed schema validation (${lastIssues}). Call ${toolName} again with input that matches the schema exactly.`;

    const started = Date.now();
    let resp;
    try {
      resp = await anthropic.messages.create({
        model: opts.model,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: [{ role: "user", content: userContent }],
        tools: [tool as Anthropic.Tool],
        tool_choice: { type: "tool", name: toolName },
      });
    } catch (err) {
      logAICall({
        feature: opts.feature,
        model: opts.model,
        prompt_version: opts.promptVersion,
        attempt,
        status: "request_error",
        latency_ms: Date.now() - started,
        message: err instanceof Error ? err.message : String(err),
      });
      throw new AIOutputError("AI_REQUEST_FAILED");
    }

    const block = resp.content.find((b) => b.type === "tool_use");
    const validated = block
      ? validateStructured(opts.schema, block.input)
      : ({ success: false, issues: "no tool_use block in response" } as const);

    logAICall({
      feature: opts.feature,
      model: opts.model,
      prompt_version: opts.promptVersion,
      attempt,
      status: validated.success ? "ok" : "invalid_output",
      stop_reason: resp.stop_reason,
      latency_ms: Date.now() - started,
      input_tokens: resp.usage.input_tokens,
      output_tokens: resp.usage.output_tokens,
    });

    if (validated.success) return validated.data;
    lastIssues = validated.issues;
  }

  throw new AIOutputError("AI_INVALID_OUTPUT", lastIssues);
}
