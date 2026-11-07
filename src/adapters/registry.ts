// Adapter registry: one status per facility, and the adapter to use. Default is the null adapter.
// Only an approved AND enabled facility gets the connected adapter, which in this build is a stub that throws.
import type { KV } from "../core/store";
import { connectionStatus } from "../core/connections";
import { FACILITY_IDS, NULL_ADAPTERS, type ConnectionStatus, type FacilityId, type PortMap } from "../core/ports";
import { CONNECTED_STUBS } from "./connectedStubs";

export interface Registry {
  status(id: FacilityId): ConnectionStatus;
  statuses(): Record<FacilityId, ConnectionStatus>;
  get<K extends FacilityId>(id: K): PortMap[K];
}

export function createRegistry(kv: KV): Registry {
  const status = (id: FacilityId) => connectionStatus(kv, id);
  return {
    status,
    statuses: () => Object.fromEntries(FACILITY_IDS.map((id) => [id, status(id)])) as Record<FacilityId, ConnectionStatus>,
    get: <K extends FacilityId>(id: K): PortMap[K] => (status(id) === "connected" ? CONNECTED_STUBS[id] : NULL_ADAPTERS[id]),
  };
}
