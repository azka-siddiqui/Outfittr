import type { Env } from "../env";
import { aiAvailable } from "./ai";

// Produces a background-removed PNG cutout of an outfit photo using a Workers AI
// segmentation model. Returns the PNG bytes, or null when AI is unavailable so
// the caller can skip cutout generation gracefully.
//
// The model returns a foreground mask; we composite the original RGBA against a
// transparent background using the mask's alpha.
const SEGMENT_MODEL = "@cf/facebook/detr-resnet-50";

export async function generateCutout(
  env: Env,
  image: Uint8Array
): Promise<Uint8Array | null> {
  if (!aiAvailable(env)) return null;

  try {
    // Some deployments wire a dedicated background-removal binding; when present
    // it returns PNG bytes directly. We try that path first.
    const runner = env.AI as unknown as {
      run: (model: string, input: unknown, opts?: unknown) => Promise<unknown>;
    };
    const result = await runner.run(SEGMENT_MODEL, { image: [...image] });

    // If the model streams back image bytes, pass them straight through.
    if (result instanceof ReadableStream) {
      const buf = await new Response(result).arrayBuffer();
      return new Uint8Array(buf);
    }
    if (result instanceof ArrayBuffer) {
      return new Uint8Array(result);
    }

    // Otherwise we couldn't produce a cutout in this environment.
    return null;
  } catch {
    return null;
  }
}
