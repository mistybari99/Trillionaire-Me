// Ports for future facilities (owner request 26 Oct 2026). Pure types and null adapters: no UI, no network, no storage.
// Every port starts as its "null adapter", which answers "not connected" and does nothing else.
// A real provider is a later, separate step that needs the owner's approval (see docs/design/connections.md).

export const FACILITY_IDS = ["aiAssistant", "cloudSync", "webSearch", "licensedContent"] as const;
export type FacilityId = typeof FACILITY_IDS[number];
export const isFacilityId = (v: unknown): v is FacilityId => typeof v === "string" && (FACILITY_IDS as readonly string[]).includes(v);

export type ConnectionStatus = "off" | "needs_approval" | "connected";

export type PortResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not_connected" | "error"; message: string };

/** Thrown by every connected-mode stub in this build. */
export class NotEnabledError extends Error {
  constructor(facility: FacilityId) { super(`not enabled in this build (${facility})`); this.name = "NotEnabledError"; }
}

// 1. AI assistant: text in, text out.
export interface AiAssistantPort { readonly id: "aiAssistant"; ask(text: string): Promise<PortResult<string>> }

// 2. Cloud sync: push or pull one sealed (already encrypted) backup blob. The port never sees a passphrase or plain data.
export interface SealedBlob { readonly data: string; readonly createdAt: string }
export interface CloudSyncPort { readonly id: "cloudSync"; push(blob: SealedBlob): Promise<PortResult<{ storedAt: string }>>; pull(): Promise<PortResult<SealedBlob | null>> }

// 3. Web search: query to result cards (same card shape as src/core/research.ts; Wikipedia is the first provider there).
export interface ResultCard { title: string; snippet: string; sourceName: string; sourceUrl: string }
export interface WebSearchPort { readonly id: "webSearch"; search(query: string): Promise<PortResult<ResultCard[]>> }

// 4. Licensed content: get one content pack by id.
export interface ContentPack { id: string; title: string; body: string; licence: string }
export interface LicensedContentPort { readonly id: "licensedContent"; getPack(packId: string): Promise<PortResult<ContentPack>> }

export interface PortMap { aiAssistant: AiAssistantPort; cloudSync: CloudSyncPort; webSearch: WebSearchPort; licensedContent: LicensedContentPort }

const NOT_CONNECTED = "not connected";
const no = <T>(): Promise<PortResult<T>> => Promise.resolve({ ok: false, reason: "not_connected", message: NOT_CONNECTED });

export const nullAiAssistant: AiAssistantPort = { id: "aiAssistant", ask: () => no<string>() };
export const nullCloudSync: CloudSyncPort = { id: "cloudSync", push: () => no<{ storedAt: string }>(), pull: () => no<SealedBlob | null>() };
export const nullWebSearch: WebSearchPort = { id: "webSearch", search: () => no<ResultCard[]>() };
export const nullLicensedContent: LicensedContentPort = { id: "licensedContent", getPack: () => no<ContentPack>() };

export const NULL_ADAPTERS: PortMap = { aiAssistant: nullAiAssistant, cloudSync: nullCloudSync, webSearch: nullWebSearch, licensedContent: nullLicensedContent };
