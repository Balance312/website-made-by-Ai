import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Prune stale rate-limit records every hour to keep the table lean
crons.interval(
  "prune stale rate limits",
  { hours: 1 },
  internal.security.pruneStaleRateLimits,
  {},
);

export default crons;
