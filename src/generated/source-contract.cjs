// SPDX-License-Identifier: AGPL-3.0-only
// @ts-nocheck
// Generated from exported schemas; run npm run build:validators.
"use strict";
exports.validateSourceContract = validate52;
const schema19 = {"title":"JSON Quality source contract, cohort 4","description":"Selected complete source quality contract. Payload bytes travel separately as a backpressured stream. No compatibility with whole-document requests.","type":"object","additionalProperties":false,"properties":{"path":{"type":"string","minLength":1},"format":{"enum":["json","jsonl"]},"formatContract":{"enum":["prettier-json","producer-json-body","producer-json-indent","producer-json-indent-body","producer-json-compact","producer-json-compact-body","preserved-bytes"]},"normalization":{"enum":["NFC","preserve"]},"allowEmptyKeys":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*/$"}},"allowSourceRewrites":{"const":false},"owner":{"type":"string","pattern":"\\S"},"reason":{"type":"string","pattern":"\\S"},"nfcExemptStringValues":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/nfcExemptStringValuePins"},"expected":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/sourceExpectation"}},"allOf":[{"if":{"properties":{"nfcExemptStringValues":true},"required":["nfcExemptStringValues"]},"then":{"properties":{"allowSourceRewrites":true,"owner":true,"reason":true},"required":["allowSourceRewrites","owner","reason"]}}],"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://github.com/Hadden-Industries/json-quality/schema/source-contract/v4"};
const func1 = Object.prototype.hasOwnProperty;
const func2 = require("ajv/dist/runtime/ucs2length").default;
const pattern3 = new RegExp("^(?:/(?:[^~/]|~[01])*)*/$", "u");
const pattern4 = new RegExp("\\S", "u");
const schema22 = {"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"object","additionalProperties":false,"required":["pointer","sha256","byteLength"],"properties":{"pointer":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*$"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byteLength":{"$ref":"#/$defs/positiveIntegerText"},"record":{"type":"object","additionalProperties":false,"required":["pointer","value"],"properties":{"pointer":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*$"},"value":{"type":"string","minLength":1}}}}}};
const pattern10 = new RegExp("^(?:/(?:[^~/]|~[01])*)*$", "u");
const pattern11 = new RegExp("^[a-f0-9]{64}$", "u");
const schema23 = {"description":"Canonical positive decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.","type":"string","pattern":"^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$","maxLength":20};
const pattern12 = new RegExp("^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$", "u");

function validate57(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate57.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(typeof data === "string"){
if(func2(data) > 20){
validate57.errors = [{instancePath,schemaPath:"#/maxLength",keyword:"maxLength",params:{limit: 20},message:"must NOT have more than 20 characters"}];
return false;
}
else {
if(!pattern12.test(data)){
validate57.errors = [{instancePath,schemaPath:"#/pattern",keyword:"pattern",params:{pattern: "^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"},message:"must match pattern \""+"^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"+"\""}];
return false;
}
}
}
else {
validate57.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
validate57.errors = vErrors;
return errors === 0;
}
validate57.evaluated = {"dynamicProps":false,"dynamicItems":false};

const func10 = (function duplicateNfcPin(items) {
  const seen = new Map();
  let duplicate = null;
  for (let i = 0; i < items.length; i++) {
    const pin = items[i];
    if (
      !pin ||
      typeof pin !== "object" ||
      ![pin.pointer, pin.sha256, pin.byteLength].every(
        (value) => typeof value === "string",
      ) ||
      (pin.record !== undefined &&
        (!pin.record ||
          typeof pin.record.pointer !== "string" ||
          typeof pin.record.value !== "string"))
    )
      continue;
    const fields = [pin.pointer, pin.sha256, pin.byteLength];
    if (pin.record !== undefined)
      fields.push(pin.record.pointer, pin.record.value);
    const key = fields.map((value) => value.length + ":" + value).join("");
    if (seen.has(key)) duplicate = [i, seen.get(key)];
    seen.set(key, i);
  }
  return duplicate;
});

function validate74(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate74.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length < 1){
validate74.errors = [{instancePath,schemaPath:"#/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
let data0 = data[i0];
const _errs1 = errors;
if(errors === _errs1){
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
let missing0;
if((((data0.pointer === undefined) && (missing0 = "pointer")) || ((data0.sha256 === undefined) && (missing0 = "sha256"))) || ((data0.byteLength === undefined) && (missing0 = "byteLength"))){
validate74.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/items/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs3 = errors;
for(const key0 in data0){
if(!((((key0 === "pointer") || (key0 === "sha256")) || (key0 === "byteLength")) || (key0 === "record"))){
validate74.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs3 === errors){
if(data0.pointer !== undefined){
let data1 = data0.pointer;
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern10.test(data1)){
validate74.errors = [{instancePath:instancePath+"/" + i0+"/pointer",schemaPath:"#/items/properties/pointer/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*$"+"\""}];
return false;
}
}
else {
validate74.errors = [{instancePath:instancePath+"/" + i0+"/pointer",schemaPath:"#/items/properties/pointer/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid1 = _errs4 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data0.sha256 !== undefined){
let data2 = data0.sha256;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data2 === "string"){
if(!pattern11.test(data2)){
validate74.errors = [{instancePath:instancePath+"/" + i0+"/sha256",schemaPath:"#/items/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate74.errors = [{instancePath:instancePath+"/" + i0+"/sha256",schemaPath:"#/items/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid1 = _errs6 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data0.byteLength !== undefined){
const _errs8 = errors;
if(!(validate57(data0.byteLength, {instancePath:instancePath+"/" + i0+"/byteLength",parentData:data0,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate57.errors : vErrors.concat(validate57.errors);
errors = vErrors.length;
}
var valid1 = _errs8 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data0.record !== undefined){
let data4 = data0.record;
const _errs9 = errors;
if(errors === _errs9){
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
let missing1;
if(((data4.pointer === undefined) && (missing1 = "pointer")) || ((data4.value === undefined) && (missing1 = "value"))){
validate74.errors = [{instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs11 = errors;
for(const key1 in data4){
if(!((key1 === "pointer") || (key1 === "value"))){
validate74.errors = [{instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs11 === errors){
if(data4.pointer !== undefined){
let data5 = data4.pointer;
const _errs12 = errors;
if(errors === _errs12){
if(typeof data5 === "string"){
if(!pattern10.test(data5)){
validate74.errors = [{instancePath:instancePath+"/" + i0+"/record/pointer",schemaPath:"#/items/properties/record/properties/pointer/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*$"+"\""}];
return false;
}
}
else {
validate74.errors = [{instancePath:instancePath+"/" + i0+"/record/pointer",schemaPath:"#/items/properties/record/properties/pointer/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs12 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.value !== undefined){
let data6 = data4.value;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data6 === "string"){
if(func2(data6) < 1){
validate74.errors = [{instancePath:instancePath+"/" + i0+"/record/value",schemaPath:"#/items/properties/record/properties/value/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate74.errors = [{instancePath:instancePath+"/" + i0+"/record/value",schemaPath:"#/items/properties/record/properties/value/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs14 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
else {
validate74.errors = [{instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid1 = _errs9 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
}
}
else {
validate74.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
if(valid0){
const duplicates0 = func10(data);
if(duplicates0 !== null){
validate74.errors = [{instancePath,schemaPath:"#/uniqueItems",keyword:"uniqueItems",params:{i: duplicates0[0], j: duplicates0[1]},message:"must NOT have duplicate items (items ## "+duplicates0[1]+" and "+duplicates0[0]+" are identical)"}];
return false;
}
}
}
}
else {
validate74.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate74.errors = vErrors;
return errors === 0;
}
validate74.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};

const schema29 = {"type":"object","additionalProperties":false,"required":["sha256","byteLength","diagnostics"],"properties":{"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byteLength":{"$ref":"#/$defs/unsignedIntegerText"},"diagnostics":{"type":"array","uniqueItems":true,"items":{"$ref":"#/$defs/diagnosticIdentity"}}}};
const schema24 = {"description":"Canonical unsigned decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.","type":"string","pattern":"^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$","maxLength":20};
const pattern17 = new RegExp("^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$", "u");

function validate60(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate60.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(typeof data === "string"){
if(func2(data) > 20){
validate60.errors = [{instancePath,schemaPath:"#/maxLength",keyword:"maxLength",params:{limit: 20},message:"must NOT have more than 20 characters"}];
return false;
}
else {
if(!pattern17.test(data)){
validate60.errors = [{instancePath,schemaPath:"#/pattern",keyword:"pattern",params:{pattern: "^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"},message:"must match pattern \""+"^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"+"\""}];
return false;
}
}
}
else {
validate60.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
validate60.errors = vErrors;
return errors === 0;
}
validate60.evaluated = {"dynamicProps":false,"dynamicItems":false};

const schema25 = {"type":"object","additionalProperties":false,"required":["phase","ruleId","messageId","line","column","severity","endLine","endColumn"],"properties":{"phase":{"enum":["bytes","syntax","lint","framing"]},"ruleId":{"type":["string","null"]},"messageId":{"type":"string","minLength":1},"line":{"$ref":"#/$defs/positiveIntegerText"},"column":{"$ref":"#/$defs/positiveIntegerText"},"endLine":{"$ref":"#/$defs/positiveIntegerText"},"endColumn":{"$ref":"#/$defs/positiveIntegerText"},"record":{"$ref":"#/$defs/positiveIntegerText"},"severity":{"const":"error"},"codePoint":{"type":"string","pattern":"^U\\+[0-9A-F]{4,6}$"}}};
const pattern19 = new RegExp("^U\\+[0-9A-F]{4,6}$", "u");

function validate63(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate63.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((data.phase === undefined) && (missing0 = "phase")) || ((data.ruleId === undefined) && (missing0 = "ruleId"))) || ((data.messageId === undefined) && (missing0 = "messageId"))) || ((data.line === undefined) && (missing0 = "line"))) || ((data.column === undefined) && (missing0 = "column"))) || ((data.severity === undefined) && (missing0 = "severity"))) || ((data.endLine === undefined) && (missing0 = "endLine"))) || ((data.endColumn === undefined) && (missing0 = "endColumn"))){
validate63.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func1.call(schema25.properties, key0))){
validate63.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.phase !== undefined){
let data0 = data.phase;
const _errs2 = errors;
if(!((((data0 === "bytes") || (data0 === "syntax")) || (data0 === "lint")) || (data0 === "framing"))){
validate63.errors = [{instancePath:instancePath+"/phase",schemaPath:"#/properties/phase/enum",keyword:"enum",params:{allowedValues: schema25.properties.phase.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.ruleId !== undefined){
let data1 = data.ruleId;
const _errs3 = errors;
if((typeof data1 !== "string") && (data1 !== null)){
validate63.errors = [{instancePath:instancePath+"/ruleId",schemaPath:"#/properties/ruleId/type",keyword:"type",params:{type: schema25.properties.ruleId.type},message:"must be string,null"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.messageId !== undefined){
let data2 = data.messageId;
const _errs5 = errors;
if(errors === _errs5){
if(typeof data2 === "string"){
if(func2(data2) < 1){
validate63.errors = [{instancePath:instancePath+"/messageId",schemaPath:"#/properties/messageId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate63.errors = [{instancePath:instancePath+"/messageId",schemaPath:"#/properties/messageId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.line !== undefined){
const _errs7 = errors;
if(!(validate57(data.line, {instancePath:instancePath+"/line",parentData:data,parentDataProperty:"line",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate57.errors : vErrors.concat(validate57.errors);
errors = vErrors.length;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.column !== undefined){
const _errs8 = errors;
if(!(validate57(data.column, {instancePath:instancePath+"/column",parentData:data,parentDataProperty:"column",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate57.errors : vErrors.concat(validate57.errors);
errors = vErrors.length;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endLine !== undefined){
const _errs9 = errors;
if(!(validate57(data.endLine, {instancePath:instancePath+"/endLine",parentData:data,parentDataProperty:"endLine",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate57.errors : vErrors.concat(validate57.errors);
errors = vErrors.length;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endColumn !== undefined){
const _errs10 = errors;
if(!(validate57(data.endColumn, {instancePath:instancePath+"/endColumn",parentData:data,parentDataProperty:"endColumn",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate57.errors : vErrors.concat(validate57.errors);
errors = vErrors.length;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.record !== undefined){
const _errs11 = errors;
if(!(validate57(data.record, {instancePath:instancePath+"/record",parentData:data,parentDataProperty:"record",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate57.errors : vErrors.concat(validate57.errors);
errors = vErrors.length;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.severity !== undefined){
const _errs12 = errors;
if("error" !== data.severity){
validate63.errors = [{instancePath:instancePath+"/severity",schemaPath:"#/properties/severity/const",keyword:"const",params:{allowedValue: "error"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.codePoint !== undefined){
let data9 = data.codePoint;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data9 === "string"){
if(!pattern19.test(data9)){
validate63.errors = [{instancePath:instancePath+"/codePoint",schemaPath:"#/properties/codePoint/pattern",keyword:"pattern",params:{pattern: "^U\\+[0-9A-F]{4,6}$"},message:"must match pattern \""+"^U\\+[0-9A-F]{4,6}$"+"\""}];
return false;
}
}
else {
validate63.errors = [{instancePath:instancePath+"/codePoint",schemaPath:"#/properties/codePoint/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate63.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate63.errors = vErrors;
return errors === 0;
}
validate63.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const func0 = require("ajv/dist/runtime/equal").default;

function validate77(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate77.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.sha256 === undefined) && (missing0 = "sha256")) || ((data.byteLength === undefined) && (missing0 = "byteLength"))) || ((data.diagnostics === undefined) && (missing0 = "diagnostics"))){
validate77.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "sha256") || (key0 === "byteLength")) || (key0 === "diagnostics"))){
validate77.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.sha256 !== undefined){
let data0 = data.sha256;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(!pattern11.test(data0)){
validate77.errors = [{instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate77.errors = [{instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.byteLength !== undefined){
const _errs4 = errors;
if(!(validate60(data.byteLength, {instancePath:instancePath+"/byteLength",parentData:data,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate60.errors : vErrors.concat(validate60.errors);
errors = vErrors.length;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.diagnostics !== undefined){
let data2 = data.diagnostics;
const _errs5 = errors;
if(errors === _errs5){
if(Array.isArray(data2)){
var valid1 = true;
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
const _errs7 = errors;
if(!(validate63(data2[i0], {instancePath:instancePath+"/diagnostics/" + i0,parentData:data2,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
errors = vErrors.length;
}
var valid1 = _errs7 === errors;
if(!valid1){
break;
}
}
if(valid1){
let i1 = data2.length;
let j0;
if(i1 > 1){
outer0:
for(;i1--;){
for(j0 = i1; j0--;){
if(func0(data2[i1], data2[j0])){
validate77.errors = [{instancePath:instancePath+"/diagnostics",schemaPath:"#/properties/diagnostics/uniqueItems",keyword:"uniqueItems",params:{i: i1, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i1+" are identical)"}];
return false;
break outer0;
}
}
}
}
}
}
else {
validate77.errors = [{instancePath:instancePath+"/diagnostics",schemaPath:"#/properties/diagnostics/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate77.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate77.errors = vErrors;
return errors === 0;
}
validate77.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate52(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://github.com/Hadden-Industries/json-quality/schema/source-contract/v4" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate52.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.nfcExemptStringValues === undefined) && (missing0 = "nfcExemptStringValues")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs4 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((((data.allowSourceRewrites === undefined) && (missing1 = "allowSourceRewrites")) || ((data.owner === undefined) && (missing1 = "owner"))) || ((data.reason === undefined) && (missing1 = "reason"))){
validate52.errors = [{instancePath,schemaPath:"#/allOf/0/then/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
}
var _valid0 = _errs4 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.allowSourceRewrites = true;
props0.owner = true;
props0.reason = true;
props0.nfcExemptStringValues = true;
}
}
if(!valid1){
const err1 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
validate52.errors = vErrors;
return false;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
const _errs5 = errors;
for(const key0 in data){
if(!(func1.call(schema19.properties, key0))){
validate52.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs5 === errors){
if(data.path !== undefined){
let data0 = data.path;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data0 === "string"){
if(func2(data0) < 1){
validate52.errors = [{instancePath:instancePath+"/path",schemaPath:"#/properties/path/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/path",schemaPath:"#/properties/path/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs6 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.format !== undefined){
let data1 = data.format;
const _errs8 = errors;
if(!((data1 === "json") || (data1 === "jsonl"))){
validate52.errors = [{instancePath:instancePath+"/format",schemaPath:"#/properties/format/enum",keyword:"enum",params:{allowedValues: schema19.properties.format.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid2 = _errs8 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.formatContract !== undefined){
let data2 = data.formatContract;
const _errs9 = errors;
if(!(((((((data2 === "prettier-json") || (data2 === "producer-json-body")) || (data2 === "producer-json-indent")) || (data2 === "producer-json-indent-body")) || (data2 === "producer-json-compact")) || (data2 === "producer-json-compact-body")) || (data2 === "preserved-bytes"))){
validate52.errors = [{instancePath:instancePath+"/formatContract",schemaPath:"#/properties/formatContract/enum",keyword:"enum",params:{allowedValues: schema19.properties.formatContract.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid2 = _errs9 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.normalization !== undefined){
let data3 = data.normalization;
const _errs10 = errors;
if(!((data3 === "NFC") || (data3 === "preserve"))){
validate52.errors = [{instancePath:instancePath+"/normalization",schemaPath:"#/properties/normalization/enum",keyword:"enum",params:{allowedValues: schema19.properties.normalization.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.allowEmptyKeys !== undefined){
let data4 = data.allowEmptyKeys;
const _errs11 = errors;
if(errors === _errs11){
if(Array.isArray(data4)){
if(data4.length < 1){
validate52.errors = [{instancePath:instancePath+"/allowEmptyKeys",schemaPath:"#/properties/allowEmptyKeys/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"}];
return false;
}
else {
var valid3 = true;
const len0 = data4.length;
for(let i0=0; i0<len0; i0++){
let data5 = data4[i0];
const _errs13 = errors;
if(errors === _errs13){
if(typeof data5 === "string"){
if(!pattern3.test(data5)){
validate52.errors = [{instancePath:instancePath+"/allowEmptyKeys/" + i0,schemaPath:"#/properties/allowEmptyKeys/items/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*/$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*/$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/allowEmptyKeys/" + i0,schemaPath:"#/properties/allowEmptyKeys/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid3 = _errs13 === errors;
if(!valid3){
break;
}
}
if(valid3){
let i1 = data4.length;
let j0;
if(i1 > 1){
const indices0 = {};
for(;i1--;){
let item0 = data4[i1];
if(typeof item0 !== "string"){
continue;
}
if(typeof indices0[item0] == "number"){
j0 = indices0[item0];
validate52.errors = [{instancePath:instancePath+"/allowEmptyKeys",schemaPath:"#/properties/allowEmptyKeys/uniqueItems",keyword:"uniqueItems",params:{i: i1, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i1+" are identical)"}];
return false;
break;
}
indices0[item0] = i1;
}
}
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/allowEmptyKeys",schemaPath:"#/properties/allowEmptyKeys/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid2 = _errs11 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.allowSourceRewrites !== undefined){
const _errs15 = errors;
if(false !== data.allowSourceRewrites){
validate52.errors = [{instancePath:instancePath+"/allowSourceRewrites",schemaPath:"#/properties/allowSourceRewrites/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"}];
return false;
}
var valid2 = _errs15 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.owner !== undefined){
let data7 = data.owner;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data7 === "string"){
if(!pattern4.test(data7)){
validate52.errors = [{instancePath:instancePath+"/owner",schemaPath:"#/properties/owner/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/owner",schemaPath:"#/properties/owner/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs16 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.reason !== undefined){
let data8 = data.reason;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data8 === "string"){
if(!pattern4.test(data8)){
validate52.errors = [{instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs18 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.nfcExemptStringValues !== undefined){
const _errs20 = errors;
if(!(validate74(data.nfcExemptStringValues, {instancePath:instancePath+"/nfcExemptStringValues",parentData:data,parentDataProperty:"nfcExemptStringValues",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate74.errors : vErrors.concat(validate74.errors);
errors = vErrors.length;
}
var valid2 = _errs20 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.expected !== undefined){
const _errs21 = errors;
if(!(validate77(data.expected, {instancePath:instancePath+"/expected",parentData:data,parentDataProperty:"expected",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate77.errors : vErrors.concat(validate77.errors);
errors = vErrors.length;
}
var valid2 = _errs21 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate52.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate52.errors = vErrors;
return errors === 0;
}
validate52.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

