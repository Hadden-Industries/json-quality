// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "indexed_streams.hpp"
#include <boost/json.hpp>
#include <cmath>
#include <double-conversion/double-conversion.h>
#include <utility>
using boost::json::string_view;
using boost::system::error_code;
namespace dc = double_conversion;
struct Reader {
  StreamReader file;
  bool body = false, synthetic = false;
  int held = -2, last = -1;
  Reader(Streams &streams, Stream source, bool normalize)
      : file(streams, source), body(normalize) {}
  int raw() { return file.get(); }
  int get() {
    int c = held != -2 ? std::exchange(held, -2) : raw();
    if (body && c == '\r') {
      int next = raw();
      if (next == '\n')
        c = '\n';
      else
        held = next;
    }
    if (c < 0 && body && !synthetic && last != '\n') {
      synthetic = true;
      c = '\n';
    }
    if (c >= 0)
      last = c;
    return c;
  }
};
struct Compare {
  Reader input;
  bool matches = true;
  std::uint64_t produced = 0;
  Compare(Streams &streams, Stream source, bool body) : input(streams, source, body) {}
  void emit(string_view text) {
    produced += text.size();
    if (!matches)
      return;
    for (unsigned char c : text)
      if (input.get() != c) {
        matches = false;
        break;
      }
  }
  void end() {
    if (matches && input.get() != -1)
      matches = false;
  }
};
struct PresentationFrame {
  char type;
  std::uint64_t count = 0, lastIndex = 0;
  bool haveIndex = false, otherKey = false;
};
struct PresentationHandler {
  static constexpr std::size_t max_array_size = std::size_t(-1), max_object_size = std::size_t(-1),
                               max_string_size = std::size_t(-1), max_key_size = std::size_t(-1);
  Compare *compare = nullptr;
  bool pretty = true, indexOrder = true, partActive = false, numberLong = false;
  std::vector<PresentationFrame> stack;
  std::string keyPrefix, number, carry;
  std::uint64_t longNumbers = 0;
  void out(string_view s) {
    if (compare)
      compare->emit(s);
  }
  void line(std::size_t depth) {
    if (!pretty)
      return;
    out("\n");
    for (std::size_t i = 0; i < depth; ++i)
      out("  ");
  }
  void before() {
    if (!stack.empty() && stack.back().type == '[') {
      auto &f = stack.back();
      if (f.count++)
        out(",");
      line(stack.size());
    }
  }
  void stringPart(string_view s, bool key, bool end) {
    if (!compare)
      return;
    if (!partActive) {
      if (key) {
        auto &f = stack.back();
        if (f.count++)
          out(",");
        line(stack.size());
        keyPrefix.clear();
      } else
        before();
      out("\"");
      partActive = true;
    }
    if (key && keyPrefix.size() < 11)
      keyPrefix.append(s.data(), (std::min)(s.size(), std::size_t(11 - keyPrefix.size())));
    carry.append(s.data(), s.size());
    std::size_t n = carry.size(), valid = n;
    if (n) {
      std::size_t start = n - 1;
      while (start && ((static_cast<unsigned char>(carry[start]) & 0xc0) == 0x80))
        --start;
      unsigned char lead = carry[start];
      std::size_t needed = lead < 0x80 ? 1 : lead < 0xe0 ? 2 : lead < 0xf0 ? 3 : 4;
      if (n - start < needed)
        valid = start;
    }
    if (valid) {
      auto encoded =
          boost::json::serialize(boost::json::value(boost::json::string_view(carry.data(), valid)));
      out(string_view(encoded.data() + 1, encoded.size() - 2));
      carry.erase(0, valid);
    }
    if (end) {
      if (!carry.empty())
        throw std::runtime_error("decoded-fragment-incomplete");
      out("\"");
      partActive = false;
      if (key) {
        bool index = !keyPrefix.empty() && keyPrefix.size() <= 10 &&
                     (keyPrefix.size() == 1 || keyPrefix[0] != '0');
        std::uint64_t value = 0;
        for (unsigned char c : keyPrefix) {
          if (c < '0' || c > '9') {
            index = false;
            break;
          }
          value = value * 10 + c - '0';
        }
        index = index && value < 4294967295ULL;
        auto &f = stack.back();
        if (index) {
          if (f.otherKey || (f.haveIndex && value <= f.lastIndex))
            indexOrder = false;
          f.haveIndex = true;
          f.lastIndex = value;
        } else
          f.otherKey = true;
        out(":");
        if (pretty)
          out(" ");
      }
    }
  }
  bool numberPart(string_view s, bool end) {
    if (!compare)
      return true;
    if (!partActive) {
      before();
      partActive = true;
      number.clear();
      numberLong = false;
    }
    constexpr auto bound = dc::DoubleToStringConverter::kMaxCharsEcmaScriptShortest;
    if (!numberLong) {
      if (number.size() + s.size() > bound) {
        numberLong = true;
        number.clear();
      } else
        number.append(s.data(), s.size());
    }
    if (end) {
      if (numberLong) {
        ++longNumbers;
        compare->matches = false;
        out("0");
      } else {
        dc::StringToDoubleConverter parser(dc::StringToDoubleConverter::NO_FLAGS, 0, NAN, nullptr,
                                           nullptr);
        int used = 0;
        double value = parser.StringToDouble(number.data(), static_cast<int>(number.size()), &used);
        if (used != number.size())
          throw std::runtime_error("native-number-consumption");
        if (!std::isfinite(value))
          out("null");
        else {
          char buffer[64];
          dc::StringBuilder builder(buffer, sizeof(buffer));
          if (!dc::DoubleToStringConverter::EcmaScriptConverter().ToShortest(value, &builder))
            throw std::runtime_error("native-number-print");
          out(builder.Finalize());
        }
      }
      partActive = false;
    }
    return true;
  }
  bool on_document_begin(error_code &) { return true; }
  bool on_document_end(error_code &) { return true; }
  bool on_array_begin(error_code &) {
    before();
    out("[");
    stack.push_back({'['});
    return true;
  }
  bool on_object_begin(error_code &) {
    before();
    out("{");
    stack.push_back({'{'});
    return true;
  }
  bool close(char c) {
    auto f = stack.back();
    stack.pop_back();
    if (f.count)
      line(stack.size());
    out(string_view(&c, 1));
    return true;
  }
  bool on_array_end(std::size_t, error_code &) { return close(']'); }
  bool on_object_end(std::size_t, error_code &) { return close('}'); }
  bool on_string_part(string_view s, std::size_t, error_code &) {
    stringPart(s, false, false);
    return true;
  }
  bool on_string(string_view s, std::size_t, error_code &) {
    stringPart(s, false, true);
    return true;
  }
  bool on_key_part(string_view s, std::size_t, error_code &) {
    stringPart(s, true, false);
    return true;
  }
  bool on_key(string_view s, std::size_t, error_code &) {
    stringPart(s, true, true);
    return true;
  }
  bool on_number_part(string_view s, error_code &) { return numberPart(s, false); }
  bool on_int64(std::int64_t, string_view s, error_code &) { return numberPart(s, true); }
  bool on_uint64(std::uint64_t, string_view s, error_code &) { return numberPart(s, true); }
  bool on_double(double, string_view s, error_code &) { return numberPart(s, true); }
  bool on_bool(bool b, error_code &) {
    before();
    out(b ? "true" : "false");
    return true;
  }
  bool on_null(error_code &) {
    before();
    out("null");
    return true;
  }
  bool on_comment_part(string_view, error_code &e) {
    e = boost::json::error::syntax;
    return false;
  }
  bool on_comment(string_view, error_code &e) {
    e = boost::json::error::syntax;
    return false;
  }
};
inline bool space(int c) { return c == ' ' || c == '\n' || c == '\r' || c == '\t'; }
// Validated-source layout observer. This has no authority to accept JSON grammar or Unicode.
inline bool layout(Streams &streams, Stream source, bool body) {
  Reader r(streams, source, body);
  int c = r.get(), previous = 0;
  std::size_t depth = 0;
  bool matches = true;
  while (true) {
    std::uint64_t gap = 0;
    bool gapLine = true, gapSpaces = true;
    while (space(c)) {
      if (gap == 0)
        gapLine = c == '\n';
      else if (c != ' ')
        gapLine = false;
      if (c != ' ')
        gapSpaces = false;
      ++gap;
      c = r.get();
    }
    std::uint64_t expected = 0;
    enum { NONE, SPACE, LINE } kind = NONE;
    bool closing = c == ']' || c == '}';
    bool empty = (previous == '[' && c == ']') || (previous == '{' && c == '}');
    if (c < 0) {
      expected = 1;
      kind = LINE;
    } else if (!empty && (closing || previous == ',' || previous == '[' || previous == '{')) {
      kind = LINE;
      expected = 1 + 2 * (depth - (closing ? 1 : 0));
    } else if (previous == ':') {
      kind = SPACE;
      expected = 1;
    }
    if (gap != expected || (kind == LINE && !gapLine) || (kind == SPACE && !gapSpaces))
      matches = false;
    if (c < 0)
      break;
    int token = c;
    if (c == '"') {
      bool escape = false;
      while ((c = r.get()) >= 0) {
        if (!escape && c == '"') {
          c = r.get();
          break;
        }
        if (!escape && c == '\\')
          escape = true;
        else
          escape = false;
      }
      token = 'v';
    } else if (c == '{' || c == '[') {
      ++depth;
      c = r.get();
    } else if (c == '}' || c == ']') {
      --depth;
      c = r.get();
    } else if (c == ',' || c == ':')
      c = r.get();
    else {
      while (c >= 0 && !space(c) && c != ',' && c != ']' && c != '}')
        c = r.get();
      token = 'v';
    }
    previous = token;
  }
  return matches;
}
