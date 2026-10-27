// SPDX-License-Identifier: AGPL-3.0-only
/** Tooling deadlines only; public runtime/resource contracts have separate owners. */
export const budgets = Object.freeze({
  install: 1200000,
  suite: 1800000,
  job: 7200000,
  read: 120000,
  pack: 120000,
  check: 600000,
  checkStep: 900000,
  upload: 240000,
  uploadStep: 300000,
  collection: 900000,
  registry: 1800000,
});
