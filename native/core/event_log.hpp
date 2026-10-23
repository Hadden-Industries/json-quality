// SPDX-License-Identifier: AGPL-3.0-only
// Ordered, replayable native events. Findings stay provisional until the
// grammar closes; a failed grammar makes semantic findings inapplicable.
#pragma once
#include "indexed_streams.hpp"
#include <boost/json.hpp>
namespace json = boost::json;
struct EventLog {
  Streams &streams;
  std::uint64_t scope, valueCount = 0, valuesRead = 0, valueCursor = 0, diagnosticCount = 0,
                       diagnosticsRead = 0;
  std::uint64_t line = 0, column = 0, diagnosticCursor = 0;
  std::string rule, message;
  bool finalized = false;
  explicit EventLog(Streams &owner) : streams(owner), scope(owner.nextScopeId++) {}
  void append(json::object object, bool finding = false, std::uint64_t locationLine = 0,
              std::uint64_t locationColumn = 0, const char *ruleId = "", const char *messageId = "",
              const char *phase = "") {
    auto text = json::serialize(object);
    require(text.size() <= 65536, "event-frame-limit");
    auto physical = streams.store.append(
        std::span(reinterpret_cast<const unsigned char *>(text.data()), text.size()));
    streams.store.prepare(32768);
    Statement insert(*streams.store.database,
                     "INSERT INTO "
                     "events(id,offset,length,scope,kind,accepted,line,column_number,rule,message,"
                     "phase) VALUES(?,?,?,?,?,1,?,?,?,?,?)");
    insert.integer(1, streams.nextEventId++);
    insert.integer(2, physical.offset);
    insert.integer(3, physical.length);
    insert.integer(4, scope);
    insert.integer(5, finding ? 1 : 0);
    insert.integer(6, locationLine);
    insert.integer(7, locationColumn);
    insert.text(8, ruleId ? ruleId : "");
    insert.text(9, messageId);
    insert.text(10, phase);
    require(!insert.next(), "event-insert");
    insert.finish();
    if (!finding)
      ++valueCount;
  }
  void finalize(bool syntaxValid) {
    require(!finalized, "events-already-finalized");
    if (!syntaxValid) {
      Statement update(*streams.store.database, "UPDATE events SET accepted=0 WHERE scope=? AND "
                                                "kind=1 AND phase NOT IN('bytes','syntax')");
      update.integer(1, scope);
      require(!update.next(), "event-applicability");
      update.finish();
    }
    Statement count(*streams.store.database,
                    "SELECT count(*) FROM events WHERE scope=? AND kind=1 AND accepted=1");
    count.integer(1, scope);
    require(count.next(), "finding-count");
    diagnosticCount = count.integer(0);
    count.finish();
    finalized = true;
  }
  bool ready() const {
    return valuesRead < valueCount || (finalized && diagnosticsRead < diagnosticCount);
  }
  json::value pop() {
    Reference physical;
    std::uint64_t id = 0;
    if (valuesRead < valueCount) {
      Statement query(*streams.store.database, "SELECT id,offset,length FROM events WHERE scope=? "
                                               "AND kind=0 AND id>? ORDER BY id LIMIT 1");
      query.integer(1, scope);
      query.integer(2, valueCursor);
      require(query.next(), "value-event-gap");
      id = query.integer(0);
      physical = {streams.store.owner, query.integer(1), query.integer(2)};
      query.finish();
      valueCursor = id;
      ++valuesRead;
    } else {
      require(finalized && diagnosticsRead < diagnosticCount, "finding-event-gap");
      Statement query(
          *streams.store.database,
          "SELECT id,offset,length,line,column_number,rule,message FROM events WHERE scope=? AND "
          "kind=1 AND accepted=1 AND (line,column_number,rule,message,id)>(?,?,?,?,?) ORDER BY "
          "line,column_number,rule,message,id LIMIT 1");
      query.integer(1, scope);
      query.integer(2, line);
      query.integer(3, column);
      query.text(4, rule);
      query.text(5, message);
      query.integer(6, diagnosticCursor);
      require(query.next(), "finding-event-gap");
      id = query.integer(0);
      physical = {streams.store.owner, query.integer(1), query.integer(2)};
      line = query.integer(3);
      column = query.integer(4);
      rule = query.text(5);
      message = query.text(6);
      query.finish();
      diagnosticCursor = id;
      ++diagnosticsRead;
    }
    auto bytes = streams.store.read(physical, 0, 65536);
    return json::parse(
        json::string_view(reinterpret_cast<const char *>(bytes.data()), bytes.size()));
  }
};
