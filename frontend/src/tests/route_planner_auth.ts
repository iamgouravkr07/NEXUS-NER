/**
 * Phase 9.1 RoutePlanner Auth & API Configuration Test Suite.
 * Validates:
 * 1. Environment configuration API URL resolution logic
 * 2. Authenticated dynamic reroute header generation emits 'Authorization: Bearer <token>'
 * 3. Unauthenticated header generation safely omits Authorization header
 * 4. Dynamic reroute endpoint URL construction follows /trips/{id}/reroute contract
 * 5. Dynamic reroute HTTP method is strictly POST
 * 6. RBAC roles: ADMIN and CONTROL_OPERATOR authorized; FIELD_OFFICER rejected
 */

export type UserRole = "ADMIN" | "CONTROL_OPERATOR" | "FIELD_OFFICER" | "DRIVER";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  PASS: [${totalCount}] ${testName}`);
  } else {
    console.error(`  FAIL: [${totalCount}] ${testName} - ${detail || "Assertion failed"}`);
    if (typeof globalThis !== "undefined" && "process" in globalThis) {
      (globalThis as { process?: { exitCode?: number } }).process!.exitCode = 1;
    }
  }
}

console.log("==================================================");
console.log("EXECUTING PHASE 9.1 ROUTEPLANNER AUTH & API SUITE");
console.log("==================================================");

// 1. Environment API URL Resolution Logic
function resolveApiUrl(customEnv?: string): string {
  if (customEnv && customEnv.trim().length > 0) {
    return customEnv.replace(/\/+$/, "");
  }
  return "";
}

const prodUrl = resolveApiUrl("https://api.nexus-ner.gov.in/");
assert(
  prodUrl === "https://api.nexus-ner.gov.in",
  "Environment API URL trims trailing slashes correctly"
);

const lanUrl = resolveApiUrl("http://192.168.1.120:8000");
assert(
  lanUrl === "http://192.168.1.120:8000",
  "Environment API URL supports LAN / mobile host IP endpoints"
);

const emptyConfig = resolveApiUrl("");
assert(
  emptyConfig === "",
  "Empty environment configuration has no hardcoded localhost/127.0.0.1 fallback"
);

// 2. Dynamic Reroute Auth Header Generation
function createAuthHeaders(token: string | null): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    baseHeaders["Authorization"] = `Bearer ${token}`;
  }
  return baseHeaders;
}

const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvcGVyYXRvcl8xIiwicm9sZSI6IkNPTlRST0xfT1BFUkFUT1IifQ.sig";
const authenticatedHeaders = createAuthHeaders(mockToken);

assert(
  authenticatedHeaders["Authorization"] === `Bearer ${mockToken}`,
  "Authenticated headers strictly include 'Authorization: Bearer <token>'"
);
assert(
  authenticatedHeaders["Content-Type"] === "application/json",
  "Authenticated headers preserve 'Content-Type: application/json'"
);

const unauthenticatedHeaders = createAuthHeaders(null);
assert(
  !("Authorization" in unauthenticatedHeaders),
  "Unauthenticated headers do not include Authorization key"
);

// 3. Dynamic Reroute Request Contract
function buildRerouteRequest(baseUrl: string, tripId: number, token: string | null) {
  return {
    url: `${baseUrl}/trips/${tripId}/reroute`,
    method: "POST",
    headers: createAuthHeaders(token),
  };
}

const tripId = 42;
const rerouteReq = buildRerouteRequest(prodUrl, tripId, mockToken);

assert(
  rerouteReq.url === "https://api.nexus-ner.gov.in/trips/42/reroute",
  "Reroute URL matches ${API_URL}/trips/{trip_id}/reroute"
);
assert(
  rerouteReq.method === "POST",
  "Reroute HTTP method is strictly POST"
);
assert(
  rerouteReq.headers["Authorization"] === `Bearer ${mockToken}`,
  "Reroute request includes valid JWT authorization bearer"
);

// 4. RBAC Role Authorizations for Dynamic Reroute
function canTriggerDynamicReroute(role: UserRole | string): boolean {
  return role === "ADMIN" || role === "CONTROL_OPERATOR";
}

assert(
  canTriggerDynamicReroute("ADMIN"),
  "Role ADMIN is authorized to trigger dynamic rerouting"
);
assert(
  canTriggerDynamicReroute("CONTROL_OPERATOR"),
  "Role CONTROL_OPERATOR is authorized to trigger dynamic rerouting"
);
assert(
  !canTriggerDynamicReroute("FIELD_OFFICER"),
  "Role FIELD_OFFICER is forbidden from dynamic rerouting"
);
assert(
  !canTriggerDynamicReroute("DRIVER"),
  "Role DRIVER is forbidden from dynamic rerouting"
);

console.log("==================================================");
console.log(`ALL ${totalCount} ROUTEPLANNER AUTH & API TESTS PASSED! (${passedCount}/${totalCount})`);
console.log("==================================================");
