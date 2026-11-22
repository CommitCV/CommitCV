// Node 25+ exposes a global localStorage that Node 24 (CI) lacks. Remove it so
// local runs fail the same way CI would if code touches it at import time.
Reflect.deleteProperty(globalThis, "localStorage");
