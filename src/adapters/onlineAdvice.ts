// Online suggestions slot (Block 5). OFF: it uses the aiAssistant port, which is the null adapter until the owner approves cost
// and provider (D-C). While the facility is not connected this makes NO call at all and returns "not connected".
import type { Registry } from "./registry";
import type { PortResult } from "../core/ports";

export interface OnlineSuggestionRequest { /** only the topic id the card is about; never the user's records */ topic: string }

export async function onlineSuggestion(reg: Registry, req: OnlineSuggestionRequest): Promise<PortResult<string>> {
  if (reg.status("aiAssistant") !== "connected") return { ok: false, reason: "not_connected", message: "online suggestions are off" };
  return reg.get("aiAssistant").ask(`Give one short, general tip about: ${req.topic}`);
}
