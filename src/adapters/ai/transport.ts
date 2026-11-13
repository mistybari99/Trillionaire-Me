// The transport the app ships with: it always refuses. The content security policy lets this app talk only to its own address and three named hosts,
// so no AI host can be reached. Connecting needs the owner steps in docs/design/ai-connect.md; this file is where a real transport would be wired in.
import { AssistantError, type Transport } from "../../core/assistant";

export const BLOCKED_MESSAGE = "Blocked: this build is not allowed to reach the AI host. See the connect guide.";
export const blockedTransport: Transport = () => Promise.reject(new AssistantError("blocked", BLOCKED_MESSAGE));
