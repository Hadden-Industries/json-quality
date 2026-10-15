// SPDX-License-Identifier: AGPL-3.0-only
import { tokenize } from "@humanwhocodes/momoa";

/** Independent test oracle: kinds/order, decoded strings and exact other lexemes. */
export function jsonTokenMeaning(text) {
  return tokenize(text).map((token) => {
    const raw = text.slice(token.loc.start.offset, token.loc.end.offset);
    return [token.type, token.type === "String" ? JSON.parse(raw) : raw];
  });
}
