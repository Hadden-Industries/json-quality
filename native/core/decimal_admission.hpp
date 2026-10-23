// SPDX-License-Identifier: AGPL-3.0-only
// Exact streaming decimal admission. Boost fixed-width integers hold counters;
// no input exponent or mantissa is converted to a bignum or expanded.
// The finite binary64 boundaries are exact, bounded constants derived with the
// maintained Boost integer arithmetic (ties-to-even at zero/normal/overflow).
#pragma once
#include <algorithm>
#include <boost/multiprecision/cpp_int.hpp>
#include <cstdint>
#include <span>
#include <string>
struct DecimalBoundary {
  std::string digits;
  int power;
};
inline DecimalBoundary binaryFraction(boost::multiprecision::cpp_int coefficient,
                                      unsigned denominatorPower) {
  boost::multiprecision::cpp_int factor = 1;
  for (unsigned i = 0; i < denominatorPower; ++i)
    factor *= 5;
  auto digits = (coefficient * factor).convert_to<std::string>();
  int power = static_cast<int>(digits.size()) - static_cast<int>(denominatorPower) - 1;
  while (digits.size() > 1 && digits.back() == '0')
    digits.pop_back();
  return {digits, power};
}
struct NumberFacts {
  using Wide = boost::multiprecision::int128_t;
  bool fraction = false, exponent = false, exponentNegative = false, nonzero = false,
       hasDecimal = false, hasExponent = false, discardedNonzero = false;
  std::uint64_t integerDigits = 0, fractionDigits = 0, leadingZeros = 0, trailingZeros = 0,
                exponentValue = 0;
  std::string prefix, shortLexeme;
  std::uint64_t bytes = 0;
  void append(std::span<const unsigned char> fragment) {
    for (unsigned char byte : fragment) {
      ++bytes;
      if (bytes <= 25)
        shortLexeme.push_back(byte);
      else
        shortLexeme.clear();
      if (byte == '.') {
        fraction = true;
        hasDecimal = true;
        continue;
      }
      if (byte == 'e' || byte == 'E') {
        exponent = true;
        hasExponent = true;
        continue;
      }
      if (byte == '-' || byte == '+') {
        if (exponent)
          exponentNegative = byte == '-';
        continue;
      }
      if (exponent) {
        constexpr std::uint64_t cap = std::uint64_t(INT64_MAX) + 1;
        auto digit = byte - '0';
        exponentValue = exponentValue > (cap - digit) / 10 ? cap : exponentValue * 10 + digit;
      } else {
        if (fraction)
          ++fractionDigits;
        else
          ++integerDigits;
        if (!nonzero && byte == '0') {
          ++leadingZeros;
          continue;
        }
        nonzero = true;
        if (prefix.size() < 800)
          prefix.push_back(byte);
        else
          discardedNonzero |= byte != '0';
        trailingZeros = byte == '0' ? trailingZeros + 1 : 0;
      }
    }
  }
  Wide exponentNumber() const {
    return exponentNegative ? -Wide(exponentValue) : Wide(exponentValue);
  }
  Wide power() const { return Wide(integerDigits) - Wide(leadingZeros) - 1 + exponentNumber(); }
  int compare(const DecimalBoundary &boundary) const {
    if (!nonzero)
      return -1;
    auto magnitude = power();
    if (magnitude != boundary.power)
      return magnitude > boundary.power ? 1 : -1;
    auto count = (std::max)(prefix.size(), boundary.digits.size());
    for (std::size_t i = 0; i < count; ++i) {
      char left = i < prefix.size() ? prefix[i] : '0',
           right = i < boundary.digits.size() ? boundary.digits[i] : '0';
      if (left != right)
        return left > right ? 1 : -1;
    }
    return discardedNonzero ? 1 : 0;
  }
  struct Outcome {
    bool unsafeNumber = false, unsafeInteger = false, unsafeZero = false, subnormal = false,
         exactInteger = false;
  };
  Outcome finish() const {
    static const DecimalBoundary zero = binaryFraction(1, 1075);
    static const DecimalBoundary normal =
        binaryFraction((boost::multiprecision::cpp_int(1) << 53) - 1, 1075);
    static const DecimalBoundary overflow = []() {
      boost::multiprecision::cpp_int value =
          (boost::multiprecision::cpp_int(1) << 1024) - (boost::multiprecision::cpp_int(1) << 970);
      auto digits = value.convert_to<std::string>();
      int power = static_cast<int>(digits.size()) - 1;
      while (digits.size() > 1 && digits.back() == '0')
        digits.pop_back();
      return DecimalBoundary{digits, power};
    }();
    static const DecimalBoundary safe{"9007199254740991", 15};
    Outcome result;
    if (!nonzero)
      return result;
    result.unsafeNumber = compare(overflow) >= 0;
    bool decimal = hasDecimal || hasExponent;
    if (!result.unsafeNumber) {
      if (compare(zero) <= 0)
        result.unsafeZero = true;
      else if (!decimal)
        result.unsafeInteger = compare(safe) > 0;
      else if (compare(normal) < 0)
        result.subnormal = true;
    }
    result.exactInteger = decimal &&
                          exponentNumber() - Wide(fractionDigits) + Wide(trailingZeros) >= 0 &&
                          compare(safe) > 0;
    return result;
  }
};
