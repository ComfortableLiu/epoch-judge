import * as os from 'os';

/**
 * Unique identifier for this API instance, used in SSE connection tracking.
 * Format: hostname:pid (naturally unique in Docker containers).
 */
export const INSTANCE_ID = `${os.hostname()}:${process.pid}`;
