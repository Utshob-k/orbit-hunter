// SPDX-License-Identifier: MIT
// the error of a failed request of the ias route (a bridge timeout or error, a guard, a failure of reg.js, a pool timeout or a dead pool worker): correct0 of src/shooting.js counts it as a failed
// attempt. In its own file so that src/ias/bridge.js and the pools (src/ias/reg-pool.js, src/mono-pool.js) can all import it without an import cycle; bridge.js exports it too.
export class BridgeError extends Error { constructor(msg, reason) { super(msg); this.reason = reason; } }
