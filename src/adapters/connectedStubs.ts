// Connected-mode adapters: unimplemented stubs. Every call throws "not enabled in this build".
// No provider is called and no network code exists here. A real provider replaces one stub in a later, approved step.
import { NotEnabledError, type AiAssistantPort, type CloudSyncPort, type LicensedContentPort, type PortMap, type WebSearchPort } from "../core/ports";

const ai: AiAssistantPort = { id: "aiAssistant", ask() { throw new NotEnabledError("aiAssistant"); } };
const sync: CloudSyncPort = { id: "cloudSync", push() { throw new NotEnabledError("cloudSync"); }, pull() { throw new NotEnabledError("cloudSync"); } };
const search: WebSearchPort = { id: "webSearch", search() { throw new NotEnabledError("webSearch"); } };
const licensed: LicensedContentPort = { id: "licensedContent", getPack() { throw new NotEnabledError("licensedContent"); } };

export const CONNECTED_STUBS: PortMap = { aiAssistant: ai, cloudSync: sync, webSearch: search, licensedContent: licensed };
