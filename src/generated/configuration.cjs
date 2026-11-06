// SPDX-License-Identifier: AGPL-3.0-only
// @ts-nocheck
// Generated from exported schemas; run npm run build:validators.
"use strict";
exports.validateConfiguration = validate52;
const schema19 = {"type":"object","additionalProperties":false,"properties":{"preserveSourcePresentation":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"object","additionalProperties":false,"required":["paths","owner","reason"],"properties":{"paths":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"string","minLength":1}},"owner":{"type":"string","pattern":"\\S"},"reason":{"type":"string","pattern":"\\S"}}}},"capacityLimits":{"description":"Caller-owned admission quotas. False removes all quotas, true selects configured/default quotas, and an object overrides only named fields. Null removes an individual quota. Invocation controls govern bootstrap.","anyOf":[{"type":"boolean"},{"$ref":"#/$defs/capacityLimits"}]},"schemaVersion":{"const":4},"defaults":{"type":"object","additionalProperties":false,"properties":{"formatContract":{"const":"prettier-json"},"allowSourceRewrites":{"const":true},"normalization":{"enum":["NFC","preserve"]}}},"exceptions":{"type":"array","uniqueItems":true,"items":{"type":"object","additionalProperties":false,"required":["paths","owner","reason"],"minProperties":4,"properties":{"paths":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"string","minLength":1}},"owner":{"type":"string","pattern":"\\S"},"reason":{"type":"string","pattern":"\\S"},"excludeUntrackedSources":{"const":true},"allowSourceRewrites":{"const":false},"normalization":{"enum":["NFC","preserve"]},"nfcExemptStringValues":{"$ref":"#/$defs/nfcExemptStringValuePins"},"allowEmptyKeys":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*/$"}},"formatContract":{"enum":["prettier-json","producer-json-body","producer-json-indent","producer-json-indent-body","producer-json-compact","producer-json-compact-body","preserved-bytes"]},"expected":{"type":"object","additionalProperties":false,"required":["sha256","byteLength","diagnostics"],"properties":{"linkedDocuments":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"object","additionalProperties":false,"required":["path","pointer","encoding","sha256","byteLength"],"properties":{"path":{"type":"string","minLength":1},"pointer":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*$"},"encoding":{"enum":["utf8","base64"]},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byteLength":{"$ref":"#/$defs/unsignedIntegerText"}}}},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byteLength":{"$ref":"#/$defs/unsignedIntegerText"},"diagnostics":{"type":"array","uniqueItems":true,"items":{"$ref":"#/$defs/diagnosticIdentity"}}}}}}},"nativeSources":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["id","provider","owner","reason"],"properties":{"id":{"type":"string","pattern":"^[A-Za-z][A-Za-z0-9_-]*$"},"provider":{"type":"string","pattern":"^[A-Za-z][A-Za-z0-9_-]*$"},"owner":{"type":"string","pattern":"\\S"},"reason":{"type":"string","pattern":"\\S"},"parameters":{"type":"object"},"minimumDocuments":{"type":"integer","minimum":0},"formatContract":{"enum":["prettier-json","producer-json-body","producer-json-indent","producer-json-indent-body","producer-json-compact","producer-json-compact-body"]}}}},"runtimeControls":{"anyOf":[{"type":"boolean"},{"$ref":"#/$defs/runtimeControls"}]},"transformControls":{"description":"Caller-owned quotas for this operation. False removes every quota; null removes an individual quota; an object overrides only its named fields.","anyOf":[{"type":"boolean"},{"$ref":"#/$defs/transformControls"}]}},"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4","$defs":{"runtimeControls":{"description":"Caller-selected resource controls. Null disables an individual quota; false selects no package quotas. Numeric controls remain enforceable. Finite streaming buffers are independent of aggregate quotas.","type":"object","additionalProperties":false,"properties":{"maxManagedMemoryBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":33554432},"maxTemporaryBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":2147483648},"maxNestingDepth":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":128},"maxCheckTimeMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":120000},"terminationGraceMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":1000}}},"nfcExemptStringValuePins":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"object","additionalProperties":false,"required":["pointer","sha256","byteLength"],"properties":{"pointer":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*$"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byteLength":{"$ref":"#/$defs/positiveIntegerText"},"record":{"type":"object","additionalProperties":false,"required":["pointer","value"],"properties":{"pointer":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*$"},"value":{"type":"string","minLength":1}}}}}},"capacityLimits":{"type":"object","additionalProperties":false,"properties":{"maxPhysicalAndNativeSources":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":50000},"maxSourceBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":33554432},"maxTotalSourceBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":268435456},"maxNativeLogicalAndTransformedSources":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":100000},"maxRecords":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":100000},"maxDiagnostics":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":10000},"maxPolicyBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":1048576},"maxGitOutputBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":67108864},"maxToolOutputBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":67108864},"maxToolTimeMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":120000},"maxGitTimeMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":120000},"maxRequestIdCodePoints":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":1024},"maxRequestBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":50331648},"maxRequestPathCodePoints":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":32768},"maxHumanPathCodePoints":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":512},"maxHumanPointerCodePoints":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":256}}},"unsignedIntegerText":{"description":"Canonical unsigned decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.","type":"string","pattern":"^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$","maxLength":20},"positiveIntegerText":{"description":"Canonical positive decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.","type":"string","pattern":"^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$","maxLength":20},"diagnosticIdentity":{"type":"object","additionalProperties":false,"required":["phase","ruleId","messageId","line","column","severity","endLine","endColumn"],"properties":{"phase":{"enum":["bytes","syntax","lint","framing"]},"ruleId":{"type":["string","null"]},"messageId":{"type":"string","minLength":1},"line":{"$ref":"#/$defs/positiveIntegerText"},"column":{"$ref":"#/$defs/positiveIntegerText"},"endLine":{"$ref":"#/$defs/positiveIntegerText"},"endColumn":{"$ref":"#/$defs/positiveIntegerText"},"record":{"$ref":"#/$defs/positiveIntegerText"},"severity":{"const":"error"},"codePoint":{"type":"string","pattern":"^U\\+[0-9A-F]{4,6}$"}}},"sourceExpectation":{"type":"object","additionalProperties":false,"required":["sha256","byteLength","diagnostics"],"properties":{"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byteLength":{"$ref":"#/$defs/unsignedIntegerText"},"diagnostics":{"type":"array","uniqueItems":true,"items":{"$ref":"#/$defs/diagnosticIdentity"}}}},"transformControls":{"type":"object","additionalProperties":false,"properties":{"maximumSourceBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":2097152},"maximumOutputBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":2097152},"maximumNormalizationChanges":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":4096},"maximumWritePaths":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":4096}}},"producerControls":{"type":"object","additionalProperties":false,"properties":{"maximumDepth":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":32},"maximumTotalValues":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":65536}}},"verificationControls":{"type":"object","additionalProperties":false,"properties":{"maximumArchiveBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":134217728},"maximumMemberBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":134217728},"maximumExpandedBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":536870912},"maximumMembers":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":8192},"maximumIndexBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":4194304},"maximumMetadataBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":1048576},"maximumArchiveMetadataBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":4096},"maximumPathBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":32768},"maximumDepth":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":64},"maximumVerificationTimeMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":120000},"maximumDecompressionRatio":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":128}}},"installationControls":{"type":"object","additionalProperties":false,"properties":{"maximumPackageFamilyFiles":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":50000},"maximumPackageFamilyBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":268435456},"maxCacheLookupTimeMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":60000},"maxCacheOutputBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":1048576}}},"acquisitionControls":{"type":"object","additionalProperties":false,"properties":{"maxAcquisitionTimeMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":1200000}}}}};
const func1 = require("ajv/dist/runtime/ucs2length").default;
const func0 = require("ajv/dist/runtime/equal").default;
const func3 = Object.prototype.hasOwnProperty;
const pattern3 = new RegExp("\\S", "u");
const pattern11 = new RegExp("^(?:/(?:[^~/]|~[01])*)*/$", "u");
const pattern7 = new RegExp("^(?:/(?:[^~/]|~[01])*)*$", "u");
const pattern8 = new RegExp("^[a-f0-9]{64}$", "u");
const pattern17 = new RegExp("^[A-Za-z][A-Za-z0-9_-]*$", "u");
const schema20 = {"type":"object","additionalProperties":false,"properties":{"maxPhysicalAndNativeSources":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":50000},"maxSourceBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":33554432},"maxTotalSourceBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":268435456},"maxNativeLogicalAndTransformedSources":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":100000},"maxRecords":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":100000},"maxDiagnostics":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":10000},"maxPolicyBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":1048576},"maxGitOutputBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":67108864},"maxToolOutputBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":67108864},"maxToolTimeMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":120000},"maxGitTimeMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":120000},"maxRequestIdCodePoints":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":1024},"maxRequestBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":50331648},"maxRequestPathCodePoints":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":32768},"maxHumanPathCodePoints":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":512},"maxHumanPointerCodePoints":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":256}}};

function validate53(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate53.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
if(!(func3.call(schema20.properties, key0))){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
if(data.maxPhysicalAndNativeSources !== undefined){
let data0 = data.maxPhysicalAndNativeSources;
if((!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))) && (data0 !== null)){
const err1 = {instancePath:instancePath+"/maxPhysicalAndNativeSources",schemaPath:"#/properties/maxPhysicalAndNativeSources/type",keyword:"type",params:{type: schema20.properties.maxPhysicalAndNativeSources.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if((typeof data0 == "number") && (isFinite(data0))){
if(data0 > 9007199254740991 || isNaN(data0)){
const err2 = {instancePath:instancePath+"/maxPhysicalAndNativeSources",schemaPath:"#/properties/maxPhysicalAndNativeSources/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0 < 1 || isNaN(data0)){
const err3 = {instancePath:instancePath+"/maxPhysicalAndNativeSources",schemaPath:"#/properties/maxPhysicalAndNativeSources/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
if(data.maxSourceBytes !== undefined){
let data1 = data.maxSourceBytes;
if((!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))) && (data1 !== null)){
const err4 = {instancePath:instancePath+"/maxSourceBytes",schemaPath:"#/properties/maxSourceBytes/type",keyword:"type",params:{type: schema20.properties.maxSourceBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740991 || isNaN(data1)){
const err5 = {instancePath:instancePath+"/maxSourceBytes",schemaPath:"#/properties/maxSourceBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data1 < 1 || isNaN(data1)){
const err6 = {instancePath:instancePath+"/maxSourceBytes",schemaPath:"#/properties/maxSourceBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
if(data.maxTotalSourceBytes !== undefined){
let data2 = data.maxTotalSourceBytes;
if((!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))) && (data2 !== null)){
const err7 = {instancePath:instancePath+"/maxTotalSourceBytes",schemaPath:"#/properties/maxTotalSourceBytes/type",keyword:"type",params:{type: schema20.properties.maxTotalSourceBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 9007199254740991 || isNaN(data2)){
const err8 = {instancePath:instancePath+"/maxTotalSourceBytes",schemaPath:"#/properties/maxTotalSourceBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2 < 1 || isNaN(data2)){
const err9 = {instancePath:instancePath+"/maxTotalSourceBytes",schemaPath:"#/properties/maxTotalSourceBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
if(data.maxNativeLogicalAndTransformedSources !== undefined){
let data3 = data.maxNativeLogicalAndTransformedSources;
if((!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))) && (data3 !== null)){
const err10 = {instancePath:instancePath+"/maxNativeLogicalAndTransformedSources",schemaPath:"#/properties/maxNativeLogicalAndTransformedSources/type",keyword:"type",params:{type: schema20.properties.maxNativeLogicalAndTransformedSources.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 > 9007199254740991 || isNaN(data3)){
const err11 = {instancePath:instancePath+"/maxNativeLogicalAndTransformedSources",schemaPath:"#/properties/maxNativeLogicalAndTransformedSources/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3 < 1 || isNaN(data3)){
const err12 = {instancePath:instancePath+"/maxNativeLogicalAndTransformedSources",schemaPath:"#/properties/maxNativeLogicalAndTransformedSources/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
if(data.maxRecords !== undefined){
let data4 = data.maxRecords;
if((!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))) && (data4 !== null)){
const err13 = {instancePath:instancePath+"/maxRecords",schemaPath:"#/properties/maxRecords/type",keyword:"type",params:{type: schema20.properties.maxRecords.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740991 || isNaN(data4)){
const err14 = {instancePath:instancePath+"/maxRecords",schemaPath:"#/properties/maxRecords/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data4 < 1 || isNaN(data4)){
const err15 = {instancePath:instancePath+"/maxRecords",schemaPath:"#/properties/maxRecords/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
if(data.maxDiagnostics !== undefined){
let data5 = data.maxDiagnostics;
if((!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))) && (data5 !== null)){
const err16 = {instancePath:instancePath+"/maxDiagnostics",schemaPath:"#/properties/maxDiagnostics/type",keyword:"type",params:{type: schema20.properties.maxDiagnostics.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
const err17 = {instancePath:instancePath+"/maxDiagnostics",schemaPath:"#/properties/maxDiagnostics/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data5 < 1 || isNaN(data5)){
const err18 = {instancePath:instancePath+"/maxDiagnostics",schemaPath:"#/properties/maxDiagnostics/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
}
if(data.maxPolicyBytes !== undefined){
let data6 = data.maxPolicyBytes;
if((!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))) && (data6 !== null)){
const err19 = {instancePath:instancePath+"/maxPolicyBytes",schemaPath:"#/properties/maxPolicyBytes/type",keyword:"type",params:{type: schema20.properties.maxPolicyBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 9007199254740991 || isNaN(data6)){
const err20 = {instancePath:instancePath+"/maxPolicyBytes",schemaPath:"#/properties/maxPolicyBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data6 < 1 || isNaN(data6)){
const err21 = {instancePath:instancePath+"/maxPolicyBytes",schemaPath:"#/properties/maxPolicyBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
if(data.maxGitOutputBytes !== undefined){
let data7 = data.maxGitOutputBytes;
if((!(((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7))) && (isFinite(data7)))) && (data7 !== null)){
const err22 = {instancePath:instancePath+"/maxGitOutputBytes",schemaPath:"#/properties/maxGitOutputBytes/type",keyword:"type",params:{type: schema20.properties.maxGitOutputBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 > 9007199254740991 || isNaN(data7)){
const err23 = {instancePath:instancePath+"/maxGitOutputBytes",schemaPath:"#/properties/maxGitOutputBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data7 < 1 || isNaN(data7)){
const err24 = {instancePath:instancePath+"/maxGitOutputBytes",schemaPath:"#/properties/maxGitOutputBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
if(data.maxToolOutputBytes !== undefined){
let data8 = data.maxToolOutputBytes;
if((!(((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8))) && (isFinite(data8)))) && (data8 !== null)){
const err25 = {instancePath:instancePath+"/maxToolOutputBytes",schemaPath:"#/properties/maxToolOutputBytes/type",keyword:"type",params:{type: schema20.properties.maxToolOutputBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if((typeof data8 == "number") && (isFinite(data8))){
if(data8 > 9007199254740991 || isNaN(data8)){
const err26 = {instancePath:instancePath+"/maxToolOutputBytes",schemaPath:"#/properties/maxToolOutputBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data8 < 1 || isNaN(data8)){
const err27 = {instancePath:instancePath+"/maxToolOutputBytes",schemaPath:"#/properties/maxToolOutputBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
if(data.maxToolTimeMs !== undefined){
let data9 = data.maxToolTimeMs;
if((!(((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9))) && (isFinite(data9)))) && (data9 !== null)){
const err28 = {instancePath:instancePath+"/maxToolTimeMs",schemaPath:"#/properties/maxToolTimeMs/type",keyword:"type",params:{type: schema20.properties.maxToolTimeMs.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if((typeof data9 == "number") && (isFinite(data9))){
if(data9 > 9007199254740991 || isNaN(data9)){
const err29 = {instancePath:instancePath+"/maxToolTimeMs",schemaPath:"#/properties/maxToolTimeMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data9 < 1 || isNaN(data9)){
const err30 = {instancePath:instancePath+"/maxToolTimeMs",schemaPath:"#/properties/maxToolTimeMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
}
if(data.maxGitTimeMs !== undefined){
let data10 = data.maxGitTimeMs;
if((!(((typeof data10 == "number") && (!(data10 % 1) && !isNaN(data10))) && (isFinite(data10)))) && (data10 !== null)){
const err31 = {instancePath:instancePath+"/maxGitTimeMs",schemaPath:"#/properties/maxGitTimeMs/type",keyword:"type",params:{type: schema20.properties.maxGitTimeMs.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if((typeof data10 == "number") && (isFinite(data10))){
if(data10 > 9007199254740991 || isNaN(data10)){
const err32 = {instancePath:instancePath+"/maxGitTimeMs",schemaPath:"#/properties/maxGitTimeMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data10 < 1 || isNaN(data10)){
const err33 = {instancePath:instancePath+"/maxGitTimeMs",schemaPath:"#/properties/maxGitTimeMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
if(data.maxRequestIdCodePoints !== undefined){
let data11 = data.maxRequestIdCodePoints;
if((!(((typeof data11 == "number") && (!(data11 % 1) && !isNaN(data11))) && (isFinite(data11)))) && (data11 !== null)){
const err34 = {instancePath:instancePath+"/maxRequestIdCodePoints",schemaPath:"#/properties/maxRequestIdCodePoints/type",keyword:"type",params:{type: schema20.properties.maxRequestIdCodePoints.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if((typeof data11 == "number") && (isFinite(data11))){
if(data11 > 9007199254740991 || isNaN(data11)){
const err35 = {instancePath:instancePath+"/maxRequestIdCodePoints",schemaPath:"#/properties/maxRequestIdCodePoints/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data11 < 1 || isNaN(data11)){
const err36 = {instancePath:instancePath+"/maxRequestIdCodePoints",schemaPath:"#/properties/maxRequestIdCodePoints/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
}
if(data.maxRequestBytes !== undefined){
let data12 = data.maxRequestBytes;
if((!(((typeof data12 == "number") && (!(data12 % 1) && !isNaN(data12))) && (isFinite(data12)))) && (data12 !== null)){
const err37 = {instancePath:instancePath+"/maxRequestBytes",schemaPath:"#/properties/maxRequestBytes/type",keyword:"type",params:{type: schema20.properties.maxRequestBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if((typeof data12 == "number") && (isFinite(data12))){
if(data12 > 9007199254740991 || isNaN(data12)){
const err38 = {instancePath:instancePath+"/maxRequestBytes",schemaPath:"#/properties/maxRequestBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data12 < 1 || isNaN(data12)){
const err39 = {instancePath:instancePath+"/maxRequestBytes",schemaPath:"#/properties/maxRequestBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
if(data.maxRequestPathCodePoints !== undefined){
let data13 = data.maxRequestPathCodePoints;
if((!(((typeof data13 == "number") && (!(data13 % 1) && !isNaN(data13))) && (isFinite(data13)))) && (data13 !== null)){
const err40 = {instancePath:instancePath+"/maxRequestPathCodePoints",schemaPath:"#/properties/maxRequestPathCodePoints/type",keyword:"type",params:{type: schema20.properties.maxRequestPathCodePoints.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if((typeof data13 == "number") && (isFinite(data13))){
if(data13 > 9007199254740991 || isNaN(data13)){
const err41 = {instancePath:instancePath+"/maxRequestPathCodePoints",schemaPath:"#/properties/maxRequestPathCodePoints/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data13 < 1 || isNaN(data13)){
const err42 = {instancePath:instancePath+"/maxRequestPathCodePoints",schemaPath:"#/properties/maxRequestPathCodePoints/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
}
if(data.maxHumanPathCodePoints !== undefined){
let data14 = data.maxHumanPathCodePoints;
if((!(((typeof data14 == "number") && (!(data14 % 1) && !isNaN(data14))) && (isFinite(data14)))) && (data14 !== null)){
const err43 = {instancePath:instancePath+"/maxHumanPathCodePoints",schemaPath:"#/properties/maxHumanPathCodePoints/type",keyword:"type",params:{type: schema20.properties.maxHumanPathCodePoints.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if((typeof data14 == "number") && (isFinite(data14))){
if(data14 > 9007199254740991 || isNaN(data14)){
const err44 = {instancePath:instancePath+"/maxHumanPathCodePoints",schemaPath:"#/properties/maxHumanPathCodePoints/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data14 < 1 || isNaN(data14)){
const err45 = {instancePath:instancePath+"/maxHumanPathCodePoints",schemaPath:"#/properties/maxHumanPathCodePoints/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
}
if(data.maxHumanPointerCodePoints !== undefined){
let data15 = data.maxHumanPointerCodePoints;
if((!(((typeof data15 == "number") && (!(data15 % 1) && !isNaN(data15))) && (isFinite(data15)))) && (data15 !== null)){
const err46 = {instancePath:instancePath+"/maxHumanPointerCodePoints",schemaPath:"#/properties/maxHumanPointerCodePoints/type",keyword:"type",params:{type: schema20.properties.maxHumanPointerCodePoints.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
if((typeof data15 == "number") && (isFinite(data15))){
if(data15 > 9007199254740991 || isNaN(data15)){
const err47 = {instancePath:instancePath+"/maxHumanPointerCodePoints",schemaPath:"#/properties/maxHumanPointerCodePoints/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(data15 < 1 || isNaN(data15)){
const err48 = {instancePath:instancePath+"/maxHumanPointerCodePoints",schemaPath:"#/properties/maxHumanPointerCodePoints/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
}
}
else {
const err49 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
validate53.errors = vErrors;
return errors === 0;
}
validate53.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema21 = {"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"object","additionalProperties":false,"required":["pointer","sha256","byteLength"],"properties":{"pointer":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*$"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byteLength":{"$ref":"#/$defs/positiveIntegerText"},"record":{"type":"object","additionalProperties":false,"required":["pointer","value"],"properties":{"pointer":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*$"},"value":{"type":"string","minLength":1}}}}}};
const schema22 = {"description":"Canonical positive decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.","type":"string","pattern":"^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$","maxLength":20};
const pattern9 = new RegExp("^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$", "u");

function validate56(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate56.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(typeof data === "string"){
if(func1(data) > 20){
const err0 = {instancePath,schemaPath:"#/maxLength",keyword:"maxLength",params:{limit: 20},message:"must NOT have more than 20 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(!pattern9.test(data)){
const err1 = {instancePath,schemaPath:"#/pattern",keyword:"pattern",params:{pattern: "^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"},message:"must match pattern \""+"^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"+"\""};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
else {
const err2 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
validate56.errors = vErrors;
return errors === 0;
}
validate56.evaluated = {"dynamicProps":false,"dynamicItems":false};

const func8 = (function duplicateNfcPin(items) {
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

function validate55(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate55.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(Array.isArray(data)){
if(data.length < 1){
const err0 = {instancePath,schemaPath:"#/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
let data0 = data[i0];
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
if(data0.pointer === undefined){
const err1 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/required",keyword:"required",params:{missingProperty: "pointer"},message:"must have required property '"+"pointer"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data0.sha256 === undefined){
const err2 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/required",keyword:"required",params:{missingProperty: "sha256"},message:"must have required property '"+"sha256"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0.byteLength === undefined){
const err3 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/required",keyword:"required",params:{missingProperty: "byteLength"},message:"must have required property '"+"byteLength"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data0){
if(!((((key0 === "pointer") || (key0 === "sha256")) || (key0 === "byteLength")) || (key0 === "record"))){
const err4 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data0.pointer !== undefined){
let data1 = data0.pointer;
if(typeof data1 === "string"){
if(!pattern7.test(data1)){
const err5 = {instancePath:instancePath+"/" + i0+"/pointer",schemaPath:"#/items/properties/pointer/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*$"+"\""};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
else {
const err6 = {instancePath:instancePath+"/" + i0+"/pointer",schemaPath:"#/items/properties/pointer/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data0.sha256 !== undefined){
let data2 = data0.sha256;
if(typeof data2 === "string"){
if(!pattern8.test(data2)){
const err7 = {instancePath:instancePath+"/" + i0+"/sha256",schemaPath:"#/items/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/" + i0+"/sha256",schemaPath:"#/items/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data0.byteLength !== undefined){
if(!(validate56(data0.byteLength, {instancePath:instancePath+"/" + i0+"/byteLength",parentData:data0,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data0.record !== undefined){
let data4 = data0.record;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.pointer === undefined){
const err9 = {instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/required",keyword:"required",params:{missingProperty: "pointer"},message:"must have required property '"+"pointer"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data4.value === undefined){
const err10 = {instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
for(const key1 in data4){
if(!((key1 === "pointer") || (key1 === "value"))){
const err11 = {instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data4.pointer !== undefined){
let data5 = data4.pointer;
if(typeof data5 === "string"){
if(!pattern7.test(data5)){
const err12 = {instancePath:instancePath+"/" + i0+"/record/pointer",schemaPath:"#/items/properties/record/properties/pointer/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/" + i0+"/record/pointer",schemaPath:"#/items/properties/record/properties/pointer/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data4.value !== undefined){
let data6 = data4.value;
if(typeof data6 === "string"){
if(func1(data6) < 1){
const err14 = {instancePath:instancePath+"/" + i0+"/record/value",schemaPath:"#/items/properties/record/properties/value/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/" + i0+"/record/value",schemaPath:"#/items/properties/record/properties/value/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
const duplicates0 = func8(data);
if(duplicates0 !== null){
const err18 = {instancePath,schemaPath:"#/uniqueItems",keyword:"uniqueItems",params:{i: duplicates0[0], j: duplicates0[1]},message:"must NOT have duplicate items (items ## "+duplicates0[1]+" and "+duplicates0[0]+" are identical)"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
else {
const err19 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
validate55.errors = vErrors;
return errors === 0;
}
validate55.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};

const schema23 = {"description":"Canonical unsigned decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.","type":"string","pattern":"^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$","maxLength":20};
const pattern14 = new RegExp("^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$", "u");

function validate59(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate59.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(typeof data === "string"){
if(func1(data) > 20){
const err0 = {instancePath,schemaPath:"#/maxLength",keyword:"maxLength",params:{limit: 20},message:"must NOT have more than 20 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(!pattern14.test(data)){
const err1 = {instancePath,schemaPath:"#/pattern",keyword:"pattern",params:{pattern: "^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"},message:"must match pattern \""+"^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"+"\""};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
else {
const err2 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
validate59.errors = vErrors;
return errors === 0;
}
validate59.evaluated = {"dynamicProps":false,"dynamicItems":false};

const schema24 = {"type":"object","additionalProperties":false,"required":["phase","ruleId","messageId","line","column","severity","endLine","endColumn"],"properties":{"phase":{"enum":["bytes","syntax","lint","framing"]},"ruleId":{"type":["string","null"]},"messageId":{"type":"string","minLength":1},"line":{"$ref":"#/$defs/positiveIntegerText"},"column":{"$ref":"#/$defs/positiveIntegerText"},"endLine":{"$ref":"#/$defs/positiveIntegerText"},"endColumn":{"$ref":"#/$defs/positiveIntegerText"},"record":{"$ref":"#/$defs/positiveIntegerText"},"severity":{"const":"error"},"codePoint":{"type":"string","pattern":"^U\\+[0-9A-F]{4,6}$"}}};
const pattern16 = new RegExp("^U\\+[0-9A-F]{4,6}$", "u");

function validate62(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate62.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.phase === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "phase"},message:"must have required property '"+"phase"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.ruleId === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "ruleId"},message:"must have required property '"+"ruleId"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.messageId === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "messageId"},message:"must have required property '"+"messageId"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.line === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "line"},message:"must have required property '"+"line"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.column === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "column"},message:"must have required property '"+"column"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.severity === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "severity"},message:"must have required property '"+"severity"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.endLine === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "endLine"},message:"must have required property '"+"endLine"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.endColumn === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "endColumn"},message:"must have required property '"+"endColumn"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
for(const key0 in data){
if(!(func3.call(schema24.properties, key0))){
const err8 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.phase !== undefined){
let data0 = data.phase;
if(!((((data0 === "bytes") || (data0 === "syntax")) || (data0 === "lint")) || (data0 === "framing"))){
const err9 = {instancePath:instancePath+"/phase",schemaPath:"#/properties/phase/enum",keyword:"enum",params:{allowedValues: schema24.properties.phase.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.ruleId !== undefined){
let data1 = data.ruleId;
if((typeof data1 !== "string") && (data1 !== null)){
const err10 = {instancePath:instancePath+"/ruleId",schemaPath:"#/properties/ruleId/type",keyword:"type",params:{type: schema24.properties.ruleId.type},message:"must be string,null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.messageId !== undefined){
let data2 = data.messageId;
if(typeof data2 === "string"){
if(func1(data2) < 1){
const err11 = {instancePath:instancePath+"/messageId",schemaPath:"#/properties/messageId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
else {
const err12 = {instancePath:instancePath+"/messageId",schemaPath:"#/properties/messageId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.line !== undefined){
if(!(validate56(data.line, {instancePath:instancePath+"/line",parentData:data,parentDataProperty:"line",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.column !== undefined){
if(!(validate56(data.column, {instancePath:instancePath+"/column",parentData:data,parentDataProperty:"column",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.endLine !== undefined){
if(!(validate56(data.endLine, {instancePath:instancePath+"/endLine",parentData:data,parentDataProperty:"endLine",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.endColumn !== undefined){
if(!(validate56(data.endColumn, {instancePath:instancePath+"/endColumn",parentData:data,parentDataProperty:"endColumn",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.record !== undefined){
if(!(validate56(data.record, {instancePath:instancePath+"/record",parentData:data,parentDataProperty:"record",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.severity !== undefined){
if("error" !== data.severity){
const err13 = {instancePath:instancePath+"/severity",schemaPath:"#/properties/severity/const",keyword:"const",params:{allowedValue: "error"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.codePoint !== undefined){
let data9 = data.codePoint;
if(typeof data9 === "string"){
if(!pattern16.test(data9)){
const err14 = {instancePath:instancePath+"/codePoint",schemaPath:"#/properties/codePoint/pattern",keyword:"pattern",params:{pattern: "^U\\+[0-9A-F]{4,6}$"},message:"must match pattern \""+"^U\\+[0-9A-F]{4,6}$"+"\""};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/codePoint",schemaPath:"#/properties/codePoint/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
validate62.errors = vErrors;
return errors === 0;
}
validate62.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema25 = {"description":"Caller-selected resource controls. Null disables an individual quota; false selects no package quotas. Numeric controls remain enforceable. Finite streaming buffers are independent of aggregate quotas.","type":"object","additionalProperties":false,"properties":{"maxManagedMemoryBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":33554432},"maxTemporaryBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":2147483648},"maxNestingDepth":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":128},"maxCheckTimeMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":120000},"terminationGraceMs":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":1000}}};

function validate69(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate69.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
if(!(((((key0 === "maxManagedMemoryBytes") || (key0 === "maxTemporaryBytes")) || (key0 === "maxNestingDepth")) || (key0 === "maxCheckTimeMs")) || (key0 === "terminationGraceMs"))){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
if(data.maxManagedMemoryBytes !== undefined){
let data0 = data.maxManagedMemoryBytes;
if((!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))) && (data0 !== null)){
const err1 = {instancePath:instancePath+"/maxManagedMemoryBytes",schemaPath:"#/properties/maxManagedMemoryBytes/type",keyword:"type",params:{type: schema25.properties.maxManagedMemoryBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if((typeof data0 == "number") && (isFinite(data0))){
if(data0 > 9007199254740991 || isNaN(data0)){
const err2 = {instancePath:instancePath+"/maxManagedMemoryBytes",schemaPath:"#/properties/maxManagedMemoryBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0 < 1 || isNaN(data0)){
const err3 = {instancePath:instancePath+"/maxManagedMemoryBytes",schemaPath:"#/properties/maxManagedMemoryBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
if(data.maxTemporaryBytes !== undefined){
let data1 = data.maxTemporaryBytes;
if((!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))) && (data1 !== null)){
const err4 = {instancePath:instancePath+"/maxTemporaryBytes",schemaPath:"#/properties/maxTemporaryBytes/type",keyword:"type",params:{type: schema25.properties.maxTemporaryBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740991 || isNaN(data1)){
const err5 = {instancePath:instancePath+"/maxTemporaryBytes",schemaPath:"#/properties/maxTemporaryBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data1 < 1 || isNaN(data1)){
const err6 = {instancePath:instancePath+"/maxTemporaryBytes",schemaPath:"#/properties/maxTemporaryBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
if(data.maxNestingDepth !== undefined){
let data2 = data.maxNestingDepth;
if((!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))) && (data2 !== null)){
const err7 = {instancePath:instancePath+"/maxNestingDepth",schemaPath:"#/properties/maxNestingDepth/type",keyword:"type",params:{type: schema25.properties.maxNestingDepth.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 9007199254740991 || isNaN(data2)){
const err8 = {instancePath:instancePath+"/maxNestingDepth",schemaPath:"#/properties/maxNestingDepth/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2 < 1 || isNaN(data2)){
const err9 = {instancePath:instancePath+"/maxNestingDepth",schemaPath:"#/properties/maxNestingDepth/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
if(data.maxCheckTimeMs !== undefined){
let data3 = data.maxCheckTimeMs;
if((!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))) && (data3 !== null)){
const err10 = {instancePath:instancePath+"/maxCheckTimeMs",schemaPath:"#/properties/maxCheckTimeMs/type",keyword:"type",params:{type: schema25.properties.maxCheckTimeMs.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 > 9007199254740991 || isNaN(data3)){
const err11 = {instancePath:instancePath+"/maxCheckTimeMs",schemaPath:"#/properties/maxCheckTimeMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3 < 1 || isNaN(data3)){
const err12 = {instancePath:instancePath+"/maxCheckTimeMs",schemaPath:"#/properties/maxCheckTimeMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
if(data.terminationGraceMs !== undefined){
let data4 = data.terminationGraceMs;
if((!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))) && (data4 !== null)){
const err13 = {instancePath:instancePath+"/terminationGraceMs",schemaPath:"#/properties/terminationGraceMs/type",keyword:"type",params:{type: schema25.properties.terminationGraceMs.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740991 || isNaN(data4)){
const err14 = {instancePath:instancePath+"/terminationGraceMs",schemaPath:"#/properties/terminationGraceMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data4 < 1 || isNaN(data4)){
const err15 = {instancePath:instancePath+"/terminationGraceMs",schemaPath:"#/properties/terminationGraceMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
}
else {
const err16 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
validate69.errors = vErrors;
return errors === 0;
}
validate69.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema26 = {"type":"object","additionalProperties":false,"properties":{"maximumSourceBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":2097152},"maximumOutputBytes":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":2097152},"maximumNormalizationChanges":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":4096},"maximumWritePaths":{"type":["integer","null"],"minimum":1,"maximum":9007199254740991,"default":4096}}};

function validate71(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate71.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
if(!((((key0 === "maximumSourceBytes") || (key0 === "maximumOutputBytes")) || (key0 === "maximumNormalizationChanges")) || (key0 === "maximumWritePaths"))){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
if(data.maximumSourceBytes !== undefined){
let data0 = data.maximumSourceBytes;
if((!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))) && (data0 !== null)){
const err1 = {instancePath:instancePath+"/maximumSourceBytes",schemaPath:"#/properties/maximumSourceBytes/type",keyword:"type",params:{type: schema26.properties.maximumSourceBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if((typeof data0 == "number") && (isFinite(data0))){
if(data0 > 9007199254740991 || isNaN(data0)){
const err2 = {instancePath:instancePath+"/maximumSourceBytes",schemaPath:"#/properties/maximumSourceBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0 < 1 || isNaN(data0)){
const err3 = {instancePath:instancePath+"/maximumSourceBytes",schemaPath:"#/properties/maximumSourceBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
if(data.maximumOutputBytes !== undefined){
let data1 = data.maximumOutputBytes;
if((!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))) && (data1 !== null)){
const err4 = {instancePath:instancePath+"/maximumOutputBytes",schemaPath:"#/properties/maximumOutputBytes/type",keyword:"type",params:{type: schema26.properties.maximumOutputBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740991 || isNaN(data1)){
const err5 = {instancePath:instancePath+"/maximumOutputBytes",schemaPath:"#/properties/maximumOutputBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data1 < 1 || isNaN(data1)){
const err6 = {instancePath:instancePath+"/maximumOutputBytes",schemaPath:"#/properties/maximumOutputBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
if(data.maximumNormalizationChanges !== undefined){
let data2 = data.maximumNormalizationChanges;
if((!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))) && (data2 !== null)){
const err7 = {instancePath:instancePath+"/maximumNormalizationChanges",schemaPath:"#/properties/maximumNormalizationChanges/type",keyword:"type",params:{type: schema26.properties.maximumNormalizationChanges.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 9007199254740991 || isNaN(data2)){
const err8 = {instancePath:instancePath+"/maximumNormalizationChanges",schemaPath:"#/properties/maximumNormalizationChanges/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2 < 1 || isNaN(data2)){
const err9 = {instancePath:instancePath+"/maximumNormalizationChanges",schemaPath:"#/properties/maximumNormalizationChanges/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
if(data.maximumWritePaths !== undefined){
let data3 = data.maximumWritePaths;
if((!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))) && (data3 !== null)){
const err10 = {instancePath:instancePath+"/maximumWritePaths",schemaPath:"#/properties/maximumWritePaths/type",keyword:"type",params:{type: schema26.properties.maximumWritePaths.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 > 9007199254740991 || isNaN(data3)){
const err11 = {instancePath:instancePath+"/maximumWritePaths",schemaPath:"#/properties/maximumWritePaths/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3 < 1 || isNaN(data3)){
const err12 = {instancePath:instancePath+"/maximumWritePaths",schemaPath:"#/properties/maximumWritePaths/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
}
else {
const err13 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
validate71.errors = vErrors;
return errors === 0;
}
validate71.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate52(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://github.com/Hadden-Industries/json-quality/schema/configuration/v4" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate52.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
if(!((((((((key0 === "preserveSourcePresentation") || (key0 === "capacityLimits")) || (key0 === "schemaVersion")) || (key0 === "defaults")) || (key0 === "exceptions")) || (key0 === "nativeSources")) || (key0 === "runtimeControls")) || (key0 === "transformControls"))){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
if(data.preserveSourcePresentation !== undefined){
let data0 = data.preserveSourcePresentation;
if(Array.isArray(data0)){
if(data0.length < 1){
const err1 = {instancePath:instancePath+"/preserveSourcePresentation",schemaPath:"#/properties/preserveSourcePresentation/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
let data1 = data0[i0];
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
if(data1.paths === undefined){
const err2 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/required",keyword:"required",params:{missingProperty: "paths"},message:"must have required property '"+"paths"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data1.owner === undefined){
const err3 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/required",keyword:"required",params:{missingProperty: "owner"},message:"must have required property '"+"owner"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data1.reason === undefined){
const err4 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
for(const key1 in data1){
if(!(((key1 === "paths") || (key1 === "owner")) || (key1 === "reason"))){
const err5 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data1.paths !== undefined){
let data2 = data1.paths;
if(Array.isArray(data2)){
if(data2.length < 1){
const err6 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths",schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
const len1 = data2.length;
for(let i1=0; i1<len1; i1++){
let data3 = data2[i1];
if(typeof data3 === "string"){
if(func1(data3) < 1){
const err7 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths/" + i1,schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/items/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths/" + i1,schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
let i2 = data2.length;
let j0;
if(i2 > 1){
const indices0 = {};
for(;i2--;){
let item0 = data2[i2];
if(typeof item0 !== "string"){
continue;
}
if(typeof indices0[item0] == "number"){
j0 = indices0[item0];
const err9 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths",schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/uniqueItems",keyword:"uniqueItems",params:{i: i2, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i2+" are identical)"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
break;
}
indices0[item0] = i2;
}
}
}
else {
const err10 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths",schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data1.owner !== undefined){
let data4 = data1.owner;
if(typeof data4 === "string"){
if(!pattern3.test(data4)){
const err11 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/owner",schemaPath:"#/properties/preserveSourcePresentation/items/properties/owner/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
else {
const err12 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/owner",schemaPath:"#/properties/preserveSourcePresentation/items/properties/owner/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data1.reason !== undefined){
let data5 = data1.reason;
if(typeof data5 === "string"){
if(!pattern3.test(data5)){
const err13 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/reason",schemaPath:"#/properties/preserveSourcePresentation/items/properties/reason/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
else {
const err14 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/reason",schemaPath:"#/properties/preserveSourcePresentation/items/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
}
else {
const err15 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
let i3 = data0.length;
let j1;
if(i3 > 1){
outer0:
for(;i3--;){
for(j1 = i3; j1--;){
if(func0(data0[i3], data0[j1])){
const err16 = {instancePath:instancePath+"/preserveSourcePresentation",schemaPath:"#/properties/preserveSourcePresentation/uniqueItems",keyword:"uniqueItems",params:{i: i3, j: j1},message:"must NOT have duplicate items (items ## "+j1+" and "+i3+" are identical)"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
break outer0;
}
}
}
}
}
else {
const err17 = {instancePath:instancePath+"/preserveSourcePresentation",schemaPath:"#/properties/preserveSourcePresentation/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data.capacityLimits !== undefined){
let data6 = data.capacityLimits;
const _errs16 = errors;
let valid8 = false;
const _errs17 = errors;
if(typeof data6 !== "boolean"){
const err18 = {instancePath:instancePath+"/capacityLimits",schemaPath:"#/properties/capacityLimits/anyOf/0/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid0 = _errs17 === errors;
valid8 = valid8 || _valid0;
const _errs19 = errors;
if(!(validate53(data6, {instancePath:instancePath+"/capacityLimits",parentData:data,parentDataProperty:"capacityLimits",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate53.errors : vErrors.concat(validate53.errors);
errors = vErrors.length;
}
var _valid0 = _errs19 === errors;
valid8 = valid8 || _valid0;
if(!valid8){
const err19 = {instancePath:instancePath+"/capacityLimits",schemaPath:"#/properties/capacityLimits/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
else {
errors = _errs16;
if(vErrors !== null){
if(_errs16){
vErrors.length = _errs16;
}
else {
vErrors = null;
}
}
}
}
if(data.schemaVersion !== undefined){
if(4 !== data.schemaVersion){
const err20 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 4},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.defaults !== undefined){
let data8 = data.defaults;
if(data8 && typeof data8 == "object" && !Array.isArray(data8)){
for(const key2 in data8){
if(!(((key2 === "formatContract") || (key2 === "allowSourceRewrites")) || (key2 === "normalization"))){
const err21 = {instancePath:instancePath+"/defaults",schemaPath:"#/properties/defaults/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data8.formatContract !== undefined){
if("prettier-json" !== data8.formatContract){
const err22 = {instancePath:instancePath+"/defaults/formatContract",schemaPath:"#/properties/defaults/properties/formatContract/const",keyword:"const",params:{allowedValue: "prettier-json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data8.allowSourceRewrites !== undefined){
if(true !== data8.allowSourceRewrites){
const err23 = {instancePath:instancePath+"/defaults/allowSourceRewrites",schemaPath:"#/properties/defaults/properties/allowSourceRewrites/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data8.normalization !== undefined){
let data11 = data8.normalization;
if(!((data11 === "NFC") || (data11 === "preserve"))){
const err24 = {instancePath:instancePath+"/defaults/normalization",schemaPath:"#/properties/defaults/properties/normalization/enum",keyword:"enum",params:{allowedValues: schema19.properties.defaults.properties.normalization.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
else {
const err25 = {instancePath:instancePath+"/defaults",schemaPath:"#/properties/defaults/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data.exceptions !== undefined){
let data12 = data.exceptions;
if(Array.isArray(data12)){
const len2 = data12.length;
for(let i4=0; i4<len2; i4++){
let data13 = data12[i4];
if(data13 && typeof data13 == "object" && !Array.isArray(data13)){
if(Object.keys(data13).length < 4){
const err26 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/minProperties",keyword:"minProperties",params:{limit: 4},message:"must NOT have fewer than 4 properties"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data13.paths === undefined){
const err27 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/required",keyword:"required",params:{missingProperty: "paths"},message:"must have required property '"+"paths"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data13.owner === undefined){
const err28 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/required",keyword:"required",params:{missingProperty: "owner"},message:"must have required property '"+"owner"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data13.reason === undefined){
const err29 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
for(const key3 in data13){
if(!(func3.call(schema19.properties.exceptions.items.properties, key3))){
const err30 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data13.paths !== undefined){
let data14 = data13.paths;
if(Array.isArray(data14)){
if(data14.length < 1){
const err31 = {instancePath:instancePath+"/exceptions/" + i4+"/paths",schemaPath:"#/properties/exceptions/items/properties/paths/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
const len3 = data14.length;
for(let i5=0; i5<len3; i5++){
let data15 = data14[i5];
if(typeof data15 === "string"){
if(func1(data15) < 1){
const err32 = {instancePath:instancePath+"/exceptions/" + i4+"/paths/" + i5,schemaPath:"#/properties/exceptions/items/properties/paths/items/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
else {
const err33 = {instancePath:instancePath+"/exceptions/" + i4+"/paths/" + i5,schemaPath:"#/properties/exceptions/items/properties/paths/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
let i6 = data14.length;
let j2;
if(i6 > 1){
const indices1 = {};
for(;i6--;){
let item1 = data14[i6];
if(typeof item1 !== "string"){
continue;
}
if(typeof indices1[item1] == "number"){
j2 = indices1[item1];
const err34 = {instancePath:instancePath+"/exceptions/" + i4+"/paths",schemaPath:"#/properties/exceptions/items/properties/paths/uniqueItems",keyword:"uniqueItems",params:{i: i6, j: j2},message:"must NOT have duplicate items (items ## "+j2+" and "+i6+" are identical)"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
break;
}
indices1[item1] = i6;
}
}
}
else {
const err35 = {instancePath:instancePath+"/exceptions/" + i4+"/paths",schemaPath:"#/properties/exceptions/items/properties/paths/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data13.owner !== undefined){
let data16 = data13.owner;
if(typeof data16 === "string"){
if(!pattern3.test(data16)){
const err36 = {instancePath:instancePath+"/exceptions/" + i4+"/owner",schemaPath:"#/properties/exceptions/items/properties/owner/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
else {
const err37 = {instancePath:instancePath+"/exceptions/" + i4+"/owner",schemaPath:"#/properties/exceptions/items/properties/owner/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
if(data13.reason !== undefined){
let data17 = data13.reason;
if(typeof data17 === "string"){
if(!pattern3.test(data17)){
const err38 = {instancePath:instancePath+"/exceptions/" + i4+"/reason",schemaPath:"#/properties/exceptions/items/properties/reason/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
else {
const err39 = {instancePath:instancePath+"/exceptions/" + i4+"/reason",schemaPath:"#/properties/exceptions/items/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
if(data13.excludeUntrackedSources !== undefined){
if(true !== data13.excludeUntrackedSources){
const err40 = {instancePath:instancePath+"/exceptions/" + i4+"/excludeUntrackedSources",schemaPath:"#/properties/exceptions/items/properties/excludeUntrackedSources/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data13.allowSourceRewrites !== undefined){
if(false !== data13.allowSourceRewrites){
const err41 = {instancePath:instancePath+"/exceptions/" + i4+"/allowSourceRewrites",schemaPath:"#/properties/exceptions/items/properties/allowSourceRewrites/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
if(data13.normalization !== undefined){
let data20 = data13.normalization;
if(!((data20 === "NFC") || (data20 === "preserve"))){
const err42 = {instancePath:instancePath+"/exceptions/" + i4+"/normalization",schemaPath:"#/properties/exceptions/items/properties/normalization/enum",keyword:"enum",params:{allowedValues: schema19.properties.exceptions.items.properties.normalization.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data13.nfcExemptStringValues !== undefined){
if(!(validate55(data13.nfcExemptStringValues, {instancePath:instancePath+"/exceptions/" + i4+"/nfcExemptStringValues",parentData:data13,parentDataProperty:"nfcExemptStringValues",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
errors = vErrors.length;
}
}
if(data13.allowEmptyKeys !== undefined){
let data22 = data13.allowEmptyKeys;
if(Array.isArray(data22)){
if(data22.length < 1){
const err43 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys",schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
const len4 = data22.length;
for(let i7=0; i7<len4; i7++){
let data23 = data22[i7];
if(typeof data23 === "string"){
if(!pattern11.test(data23)){
const err44 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys/" + i7,schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/items/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*/$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*/$"+"\""};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
else {
const err45 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys/" + i7,schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
let i8 = data22.length;
let j3;
if(i8 > 1){
const indices2 = {};
for(;i8--;){
let item2 = data22[i8];
if(typeof item2 !== "string"){
continue;
}
if(typeof indices2[item2] == "number"){
j3 = indices2[item2];
const err46 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys",schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/uniqueItems",keyword:"uniqueItems",params:{i: i8, j: j3},message:"must NOT have duplicate items (items ## "+j3+" and "+i8+" are identical)"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
break;
}
indices2[item2] = i8;
}
}
}
else {
const err47 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys",schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data13.formatContract !== undefined){
let data24 = data13.formatContract;
if(!(((((((data24 === "prettier-json") || (data24 === "producer-json-body")) || (data24 === "producer-json-indent")) || (data24 === "producer-json-indent-body")) || (data24 === "producer-json-compact")) || (data24 === "producer-json-compact-body")) || (data24 === "preserved-bytes"))){
const err48 = {instancePath:instancePath+"/exceptions/" + i4+"/formatContract",schemaPath:"#/properties/exceptions/items/properties/formatContract/enum",keyword:"enum",params:{allowedValues: schema19.properties.exceptions.items.properties.formatContract.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data13.expected !== undefined){
let data25 = data13.expected;
if(data25 && typeof data25 == "object" && !Array.isArray(data25)){
if(data25.sha256 === undefined){
const err49 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/required",keyword:"required",params:{missingProperty: "sha256"},message:"must have required property '"+"sha256"+"'"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
if(data25.byteLength === undefined){
const err50 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/required",keyword:"required",params:{missingProperty: "byteLength"},message:"must have required property '"+"byteLength"+"'"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(data25.diagnostics === undefined){
const err51 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/required",keyword:"required",params:{missingProperty: "diagnostics"},message:"must have required property '"+"diagnostics"+"'"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
for(const key4 in data25){
if(!((((key4 === "linkedDocuments") || (key4 === "sha256")) || (key4 === "byteLength")) || (key4 === "diagnostics"))){
const err52 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data25.linkedDocuments !== undefined){
let data26 = data25.linkedDocuments;
if(Array.isArray(data26)){
if(data26.length < 1){
const err53 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
const len5 = data26.length;
for(let i9=0; i9<len5; i9++){
let data27 = data26[i9];
if(data27 && typeof data27 == "object" && !Array.isArray(data27)){
if(data27.path === undefined){
const err54 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
if(data27.pointer === undefined){
const err55 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "pointer"},message:"must have required property '"+"pointer"+"'"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
if(data27.encoding === undefined){
const err56 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "encoding"},message:"must have required property '"+"encoding"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data27.sha256 === undefined){
const err57 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "sha256"},message:"must have required property '"+"sha256"+"'"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
if(data27.byteLength === undefined){
const err58 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "byteLength"},message:"must have required property '"+"byteLength"+"'"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
for(const key5 in data27){
if(!(((((key5 === "path") || (key5 === "pointer")) || (key5 === "encoding")) || (key5 === "sha256")) || (key5 === "byteLength"))){
const err59 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data27.path !== undefined){
let data28 = data27.path;
if(typeof data28 === "string"){
if(func1(data28) < 1){
const err60 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/path",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/path/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
else {
const err61 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/path",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/path/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
if(data27.pointer !== undefined){
let data29 = data27.pointer;
if(typeof data29 === "string"){
if(!pattern7.test(data29)){
const err62 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/pointer",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/pointer/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*$"+"\""};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
else {
const err63 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/pointer",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/pointer/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
}
if(data27.encoding !== undefined){
let data30 = data27.encoding;
if(!((data30 === "utf8") || (data30 === "base64"))){
const err64 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/encoding",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/encoding/enum",keyword:"enum",params:{allowedValues: schema19.properties.exceptions.items.properties.expected.properties.linkedDocuments.items.properties.encoding.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
}
if(data27.sha256 !== undefined){
let data31 = data27.sha256;
if(typeof data31 === "string"){
if(!pattern8.test(data31)){
const err65 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/sha256",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
else {
const err66 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/sha256",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
if(data27.byteLength !== undefined){
if(!(validate59(data27.byteLength, {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/byteLength",parentData:data27,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate59.errors : vErrors.concat(validate59.errors);
errors = vErrors.length;
}
}
}
else {
const err67 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
}
let i10 = data26.length;
let j4;
if(i10 > 1){
outer1:
for(;i10--;){
for(j4 = i10; j4--;){
if(func0(data26[i10], data26[j4])){
const err68 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/uniqueItems",keyword:"uniqueItems",params:{i: i10, j: j4},message:"must NOT have duplicate items (items ## "+j4+" and "+i10+" are identical)"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
break outer1;
}
}
}
}
}
else {
const err69 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
}
if(data25.sha256 !== undefined){
let data33 = data25.sha256;
if(typeof data33 === "string"){
if(!pattern8.test(data33)){
const err70 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/sha256",schemaPath:"#/properties/exceptions/items/properties/expected/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
}
else {
const err71 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/sha256",schemaPath:"#/properties/exceptions/items/properties/expected/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
if(data25.byteLength !== undefined){
if(!(validate59(data25.byteLength, {instancePath:instancePath+"/exceptions/" + i4+"/expected/byteLength",parentData:data25,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate59.errors : vErrors.concat(validate59.errors);
errors = vErrors.length;
}
}
if(data25.diagnostics !== undefined){
let data35 = data25.diagnostics;
if(Array.isArray(data35)){
const len6 = data35.length;
for(let i11=0; i11<len6; i11++){
if(!(validate62(data35[i11], {instancePath:instancePath+"/exceptions/" + i4+"/expected/diagnostics/" + i11,parentData:data35,parentDataProperty:i11,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate62.errors : vErrors.concat(validate62.errors);
errors = vErrors.length;
}
}
let i12 = data35.length;
let j5;
if(i12 > 1){
outer2:
for(;i12--;){
for(j5 = i12; j5--;){
if(func0(data35[i12], data35[j5])){
const err72 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/diagnostics",schemaPath:"#/properties/exceptions/items/properties/expected/properties/diagnostics/uniqueItems",keyword:"uniqueItems",params:{i: i12, j: j5},message:"must NOT have duplicate items (items ## "+j5+" and "+i12+" are identical)"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
break outer2;
}
}
}
}
}
else {
const err73 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/diagnostics",schemaPath:"#/properties/exceptions/items/properties/expected/properties/diagnostics/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
}
else {
const err74 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
}
}
else {
const err75 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
let i13 = data12.length;
let j6;
if(i13 > 1){
outer3:
for(;i13--;){
for(j6 = i13; j6--;){
if(func0(data12[i13], data12[j6])){
const err76 = {instancePath:instancePath+"/exceptions",schemaPath:"#/properties/exceptions/uniqueItems",keyword:"uniqueItems",params:{i: i13, j: j6},message:"must NOT have duplicate items (items ## "+j6+" and "+i13+" are identical)"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
break outer3;
}
}
}
}
}
else {
const err77 = {instancePath:instancePath+"/exceptions",schemaPath:"#/properties/exceptions/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
if(data.nativeSources !== undefined){
let data37 = data.nativeSources;
if(Array.isArray(data37)){
const len7 = data37.length;
for(let i14=0; i14<len7; i14++){
let data38 = data37[i14];
if(data38 && typeof data38 == "object" && !Array.isArray(data38)){
if(data38.id === undefined){
const err78 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
if(data38.provider === undefined){
const err79 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/required",keyword:"required",params:{missingProperty: "provider"},message:"must have required property '"+"provider"+"'"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
if(data38.owner === undefined){
const err80 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/required",keyword:"required",params:{missingProperty: "owner"},message:"must have required property '"+"owner"+"'"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
if(data38.reason === undefined){
const err81 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
for(const key6 in data38){
if(!(((((((key6 === "id") || (key6 === "provider")) || (key6 === "owner")) || (key6 === "reason")) || (key6 === "parameters")) || (key6 === "minimumDocuments")) || (key6 === "formatContract"))){
const err82 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
}
if(data38.id !== undefined){
let data39 = data38.id;
if(typeof data39 === "string"){
if(!pattern17.test(data39)){
const err83 = {instancePath:instancePath+"/nativeSources/" + i14+"/id",schemaPath:"#/properties/nativeSources/items/properties/id/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z][A-Za-z0-9_-]*$"},message:"must match pattern \""+"^[A-Za-z][A-Za-z0-9_-]*$"+"\""};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
}
else {
const err84 = {instancePath:instancePath+"/nativeSources/" + i14+"/id",schemaPath:"#/properties/nativeSources/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
}
if(data38.provider !== undefined){
let data40 = data38.provider;
if(typeof data40 === "string"){
if(!pattern17.test(data40)){
const err85 = {instancePath:instancePath+"/nativeSources/" + i14+"/provider",schemaPath:"#/properties/nativeSources/items/properties/provider/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z][A-Za-z0-9_-]*$"},message:"must match pattern \""+"^[A-Za-z][A-Za-z0-9_-]*$"+"\""};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
}
else {
const err86 = {instancePath:instancePath+"/nativeSources/" + i14+"/provider",schemaPath:"#/properties/nativeSources/items/properties/provider/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
}
if(data38.owner !== undefined){
let data41 = data38.owner;
if(typeof data41 === "string"){
if(!pattern3.test(data41)){
const err87 = {instancePath:instancePath+"/nativeSources/" + i14+"/owner",schemaPath:"#/properties/nativeSources/items/properties/owner/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
}
else {
const err88 = {instancePath:instancePath+"/nativeSources/" + i14+"/owner",schemaPath:"#/properties/nativeSources/items/properties/owner/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
}
if(data38.reason !== undefined){
let data42 = data38.reason;
if(typeof data42 === "string"){
if(!pattern3.test(data42)){
const err89 = {instancePath:instancePath+"/nativeSources/" + i14+"/reason",schemaPath:"#/properties/nativeSources/items/properties/reason/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
else {
const err90 = {instancePath:instancePath+"/nativeSources/" + i14+"/reason",schemaPath:"#/properties/nativeSources/items/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
}
if(data38.parameters !== undefined){
let data43 = data38.parameters;
if(!(data43 && typeof data43 == "object" && !Array.isArray(data43))){
const err91 = {instancePath:instancePath+"/nativeSources/" + i14+"/parameters",schemaPath:"#/properties/nativeSources/items/properties/parameters/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
}
if(data38.minimumDocuments !== undefined){
let data44 = data38.minimumDocuments;
if(!(((typeof data44 == "number") && (!(data44 % 1) && !isNaN(data44))) && (isFinite(data44)))){
const err92 = {instancePath:instancePath+"/nativeSources/" + i14+"/minimumDocuments",schemaPath:"#/properties/nativeSources/items/properties/minimumDocuments/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
if((typeof data44 == "number") && (isFinite(data44))){
if(data44 < 0 || isNaN(data44)){
const err93 = {instancePath:instancePath+"/nativeSources/" + i14+"/minimumDocuments",schemaPath:"#/properties/nativeSources/items/properties/minimumDocuments/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
}
}
if(data38.formatContract !== undefined){
let data45 = data38.formatContract;
if(!((((((data45 === "prettier-json") || (data45 === "producer-json-body")) || (data45 === "producer-json-indent")) || (data45 === "producer-json-indent-body")) || (data45 === "producer-json-compact")) || (data45 === "producer-json-compact-body"))){
const err94 = {instancePath:instancePath+"/nativeSources/" + i14+"/formatContract",schemaPath:"#/properties/nativeSources/items/properties/formatContract/enum",keyword:"enum",params:{allowedValues: schema19.properties.nativeSources.items.properties.formatContract.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
}
}
else {
const err95 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
}
}
else {
const err96 = {instancePath:instancePath+"/nativeSources",schemaPath:"#/properties/nativeSources/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
}
if(data.runtimeControls !== undefined){
let data46 = data.runtimeControls;
const _errs90 = errors;
let valid31 = false;
const _errs91 = errors;
if(typeof data46 !== "boolean"){
const err97 = {instancePath:instancePath+"/runtimeControls",schemaPath:"#/properties/runtimeControls/anyOf/0/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
var _valid1 = _errs91 === errors;
valid31 = valid31 || _valid1;
const _errs93 = errors;
if(!(validate69(data46, {instancePath:instancePath+"/runtimeControls",parentData:data,parentDataProperty:"runtimeControls",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate69.errors : vErrors.concat(validate69.errors);
errors = vErrors.length;
}
var _valid1 = _errs93 === errors;
valid31 = valid31 || _valid1;
if(!valid31){
const err98 = {instancePath:instancePath+"/runtimeControls",schemaPath:"#/properties/runtimeControls/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
else {
errors = _errs90;
if(vErrors !== null){
if(_errs90){
vErrors.length = _errs90;
}
else {
vErrors = null;
}
}
}
}
if(data.transformControls !== undefined){
let data47 = data.transformControls;
const _errs95 = errors;
let valid32 = false;
const _errs96 = errors;
if(typeof data47 !== "boolean"){
const err99 = {instancePath:instancePath+"/transformControls",schemaPath:"#/properties/transformControls/anyOf/0/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
var _valid2 = _errs96 === errors;
valid32 = valid32 || _valid2;
const _errs98 = errors;
if(!(validate71(data47, {instancePath:instancePath+"/transformControls",parentData:data,parentDataProperty:"transformControls",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
errors = vErrors.length;
}
var _valid2 = _errs98 === errors;
valid32 = valid32 || _valid2;
if(!valid32){
const err100 = {instancePath:instancePath+"/transformControls",schemaPath:"#/properties/transformControls/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
else {
errors = _errs95;
if(vErrors !== null){
if(_errs95){
vErrors.length = _errs95;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err101 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
validate52.errors = vErrors;
return errors === 0;
}
validate52.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

exports.validatePolicy = validate73;
const schema27 = {"type":"object","additionalProperties":false,"properties":{"preserveSourcePresentation":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"object","additionalProperties":false,"required":["paths","owner","reason"],"properties":{"paths":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"string","minLength":1}},"owner":{"type":"string","pattern":"\\S"},"reason":{"type":"string","pattern":"\\S"}}}},"capacityLimits":{"description":"Caller-owned admission quotas. False removes all quotas, true selects configured/default quotas, and an object overrides only named fields. Null removes an individual quota. Invocation controls govern bootstrap.","anyOf":[{"type":"boolean"},{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/capacityLimits"}]},"schemaVersion":{"const":4},"defaults":{"type":"object","additionalProperties":false,"properties":{"formatContract":{"const":"prettier-json"},"allowSourceRewrites":{"const":true},"normalization":{"enum":["NFC","preserve"]}},"required":["formatContract","allowSourceRewrites","normalization"]},"exceptions":{"type":"array","uniqueItems":true,"items":{"type":"object","additionalProperties":false,"required":["paths","owner","reason"],"minProperties":4,"properties":{"paths":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"string","minLength":1}},"owner":{"type":"string","pattern":"\\S"},"reason":{"type":"string","pattern":"\\S"},"excludeUntrackedSources":{"const":true},"allowSourceRewrites":{"const":false},"normalization":{"enum":["NFC","preserve"]},"nfcExemptStringValues":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/nfcExemptStringValuePins"},"allowEmptyKeys":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*/$"}},"formatContract":{"enum":["prettier-json","producer-json-body","producer-json-indent","producer-json-indent-body","producer-json-compact","producer-json-compact-body","preserved-bytes"]},"expected":{"type":"object","additionalProperties":false,"required":["sha256","byteLength","diagnostics"],"properties":{"linkedDocuments":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"object","additionalProperties":false,"required":["path","pointer","encoding","sha256","byteLength"],"properties":{"path":{"type":"string","minLength":1},"pointer":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*$"},"encoding":{"enum":["utf8","base64"]},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"}}}},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"byteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"diagnostics":{"type":"array","uniqueItems":true,"items":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/diagnosticIdentity"}}}}}}},"nativeSources":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["id","provider","owner","reason"],"properties":{"id":{"type":"string","pattern":"^[A-Za-z][A-Za-z0-9_-]*$"},"provider":{"type":"string","pattern":"^[A-Za-z][A-Za-z0-9_-]*$"},"owner":{"type":"string","pattern":"\\S"},"reason":{"type":"string","pattern":"\\S"},"parameters":{"type":"object"},"minimumDocuments":{"type":"integer","minimum":0},"formatContract":{"enum":["prettier-json","producer-json-body","producer-json-indent","producer-json-indent-body","producer-json-compact","producer-json-compact-body"]}}}},"runtimeControls":{"anyOf":[{"type":"boolean"},{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/runtimeControls"}]},"transformControls":{"description":"Caller-owned quotas for this operation. False removes every quota; null removes an individual quota; an object overrides only its named fields.","anyOf":[{"type":"boolean"},{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/transformControls"}]}},"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://github.com/Hadden-Industries/json-quality/schema/effective-policy/v4","title":"Resolved JSON Quality policy, cohort 4","required":["schemaVersion","defaults","exceptions"]};

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
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
if(!(func3.call(schema20.properties, key0))){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
if(data.maxPhysicalAndNativeSources !== undefined){
let data0 = data.maxPhysicalAndNativeSources;
if((!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))) && (data0 !== null)){
const err1 = {instancePath:instancePath+"/maxPhysicalAndNativeSources",schemaPath:"#/properties/maxPhysicalAndNativeSources/type",keyword:"type",params:{type: schema20.properties.maxPhysicalAndNativeSources.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if((typeof data0 == "number") && (isFinite(data0))){
if(data0 > 9007199254740991 || isNaN(data0)){
const err2 = {instancePath:instancePath+"/maxPhysicalAndNativeSources",schemaPath:"#/properties/maxPhysicalAndNativeSources/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0 < 1 || isNaN(data0)){
const err3 = {instancePath:instancePath+"/maxPhysicalAndNativeSources",schemaPath:"#/properties/maxPhysicalAndNativeSources/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
if(data.maxSourceBytes !== undefined){
let data1 = data.maxSourceBytes;
if((!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))) && (data1 !== null)){
const err4 = {instancePath:instancePath+"/maxSourceBytes",schemaPath:"#/properties/maxSourceBytes/type",keyword:"type",params:{type: schema20.properties.maxSourceBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740991 || isNaN(data1)){
const err5 = {instancePath:instancePath+"/maxSourceBytes",schemaPath:"#/properties/maxSourceBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data1 < 1 || isNaN(data1)){
const err6 = {instancePath:instancePath+"/maxSourceBytes",schemaPath:"#/properties/maxSourceBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
if(data.maxTotalSourceBytes !== undefined){
let data2 = data.maxTotalSourceBytes;
if((!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))) && (data2 !== null)){
const err7 = {instancePath:instancePath+"/maxTotalSourceBytes",schemaPath:"#/properties/maxTotalSourceBytes/type",keyword:"type",params:{type: schema20.properties.maxTotalSourceBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 9007199254740991 || isNaN(data2)){
const err8 = {instancePath:instancePath+"/maxTotalSourceBytes",schemaPath:"#/properties/maxTotalSourceBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2 < 1 || isNaN(data2)){
const err9 = {instancePath:instancePath+"/maxTotalSourceBytes",schemaPath:"#/properties/maxTotalSourceBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
if(data.maxNativeLogicalAndTransformedSources !== undefined){
let data3 = data.maxNativeLogicalAndTransformedSources;
if((!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))) && (data3 !== null)){
const err10 = {instancePath:instancePath+"/maxNativeLogicalAndTransformedSources",schemaPath:"#/properties/maxNativeLogicalAndTransformedSources/type",keyword:"type",params:{type: schema20.properties.maxNativeLogicalAndTransformedSources.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 > 9007199254740991 || isNaN(data3)){
const err11 = {instancePath:instancePath+"/maxNativeLogicalAndTransformedSources",schemaPath:"#/properties/maxNativeLogicalAndTransformedSources/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3 < 1 || isNaN(data3)){
const err12 = {instancePath:instancePath+"/maxNativeLogicalAndTransformedSources",schemaPath:"#/properties/maxNativeLogicalAndTransformedSources/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
if(data.maxRecords !== undefined){
let data4 = data.maxRecords;
if((!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))) && (data4 !== null)){
const err13 = {instancePath:instancePath+"/maxRecords",schemaPath:"#/properties/maxRecords/type",keyword:"type",params:{type: schema20.properties.maxRecords.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740991 || isNaN(data4)){
const err14 = {instancePath:instancePath+"/maxRecords",schemaPath:"#/properties/maxRecords/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data4 < 1 || isNaN(data4)){
const err15 = {instancePath:instancePath+"/maxRecords",schemaPath:"#/properties/maxRecords/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
if(data.maxDiagnostics !== undefined){
let data5 = data.maxDiagnostics;
if((!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))) && (data5 !== null)){
const err16 = {instancePath:instancePath+"/maxDiagnostics",schemaPath:"#/properties/maxDiagnostics/type",keyword:"type",params:{type: schema20.properties.maxDiagnostics.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
const err17 = {instancePath:instancePath+"/maxDiagnostics",schemaPath:"#/properties/maxDiagnostics/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data5 < 1 || isNaN(data5)){
const err18 = {instancePath:instancePath+"/maxDiagnostics",schemaPath:"#/properties/maxDiagnostics/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
}
if(data.maxPolicyBytes !== undefined){
let data6 = data.maxPolicyBytes;
if((!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))) && (data6 !== null)){
const err19 = {instancePath:instancePath+"/maxPolicyBytes",schemaPath:"#/properties/maxPolicyBytes/type",keyword:"type",params:{type: schema20.properties.maxPolicyBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 9007199254740991 || isNaN(data6)){
const err20 = {instancePath:instancePath+"/maxPolicyBytes",schemaPath:"#/properties/maxPolicyBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data6 < 1 || isNaN(data6)){
const err21 = {instancePath:instancePath+"/maxPolicyBytes",schemaPath:"#/properties/maxPolicyBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
if(data.maxGitOutputBytes !== undefined){
let data7 = data.maxGitOutputBytes;
if((!(((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7))) && (isFinite(data7)))) && (data7 !== null)){
const err22 = {instancePath:instancePath+"/maxGitOutputBytes",schemaPath:"#/properties/maxGitOutputBytes/type",keyword:"type",params:{type: schema20.properties.maxGitOutputBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 > 9007199254740991 || isNaN(data7)){
const err23 = {instancePath:instancePath+"/maxGitOutputBytes",schemaPath:"#/properties/maxGitOutputBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data7 < 1 || isNaN(data7)){
const err24 = {instancePath:instancePath+"/maxGitOutputBytes",schemaPath:"#/properties/maxGitOutputBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
if(data.maxToolOutputBytes !== undefined){
let data8 = data.maxToolOutputBytes;
if((!(((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8))) && (isFinite(data8)))) && (data8 !== null)){
const err25 = {instancePath:instancePath+"/maxToolOutputBytes",schemaPath:"#/properties/maxToolOutputBytes/type",keyword:"type",params:{type: schema20.properties.maxToolOutputBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if((typeof data8 == "number") && (isFinite(data8))){
if(data8 > 9007199254740991 || isNaN(data8)){
const err26 = {instancePath:instancePath+"/maxToolOutputBytes",schemaPath:"#/properties/maxToolOutputBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data8 < 1 || isNaN(data8)){
const err27 = {instancePath:instancePath+"/maxToolOutputBytes",schemaPath:"#/properties/maxToolOutputBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
if(data.maxToolTimeMs !== undefined){
let data9 = data.maxToolTimeMs;
if((!(((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9))) && (isFinite(data9)))) && (data9 !== null)){
const err28 = {instancePath:instancePath+"/maxToolTimeMs",schemaPath:"#/properties/maxToolTimeMs/type",keyword:"type",params:{type: schema20.properties.maxToolTimeMs.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if((typeof data9 == "number") && (isFinite(data9))){
if(data9 > 9007199254740991 || isNaN(data9)){
const err29 = {instancePath:instancePath+"/maxToolTimeMs",schemaPath:"#/properties/maxToolTimeMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data9 < 1 || isNaN(data9)){
const err30 = {instancePath:instancePath+"/maxToolTimeMs",schemaPath:"#/properties/maxToolTimeMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
}
if(data.maxGitTimeMs !== undefined){
let data10 = data.maxGitTimeMs;
if((!(((typeof data10 == "number") && (!(data10 % 1) && !isNaN(data10))) && (isFinite(data10)))) && (data10 !== null)){
const err31 = {instancePath:instancePath+"/maxGitTimeMs",schemaPath:"#/properties/maxGitTimeMs/type",keyword:"type",params:{type: schema20.properties.maxGitTimeMs.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if((typeof data10 == "number") && (isFinite(data10))){
if(data10 > 9007199254740991 || isNaN(data10)){
const err32 = {instancePath:instancePath+"/maxGitTimeMs",schemaPath:"#/properties/maxGitTimeMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data10 < 1 || isNaN(data10)){
const err33 = {instancePath:instancePath+"/maxGitTimeMs",schemaPath:"#/properties/maxGitTimeMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
if(data.maxRequestIdCodePoints !== undefined){
let data11 = data.maxRequestIdCodePoints;
if((!(((typeof data11 == "number") && (!(data11 % 1) && !isNaN(data11))) && (isFinite(data11)))) && (data11 !== null)){
const err34 = {instancePath:instancePath+"/maxRequestIdCodePoints",schemaPath:"#/properties/maxRequestIdCodePoints/type",keyword:"type",params:{type: schema20.properties.maxRequestIdCodePoints.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if((typeof data11 == "number") && (isFinite(data11))){
if(data11 > 9007199254740991 || isNaN(data11)){
const err35 = {instancePath:instancePath+"/maxRequestIdCodePoints",schemaPath:"#/properties/maxRequestIdCodePoints/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data11 < 1 || isNaN(data11)){
const err36 = {instancePath:instancePath+"/maxRequestIdCodePoints",schemaPath:"#/properties/maxRequestIdCodePoints/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
}
if(data.maxRequestBytes !== undefined){
let data12 = data.maxRequestBytes;
if((!(((typeof data12 == "number") && (!(data12 % 1) && !isNaN(data12))) && (isFinite(data12)))) && (data12 !== null)){
const err37 = {instancePath:instancePath+"/maxRequestBytes",schemaPath:"#/properties/maxRequestBytes/type",keyword:"type",params:{type: schema20.properties.maxRequestBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if((typeof data12 == "number") && (isFinite(data12))){
if(data12 > 9007199254740991 || isNaN(data12)){
const err38 = {instancePath:instancePath+"/maxRequestBytes",schemaPath:"#/properties/maxRequestBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data12 < 1 || isNaN(data12)){
const err39 = {instancePath:instancePath+"/maxRequestBytes",schemaPath:"#/properties/maxRequestBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
if(data.maxRequestPathCodePoints !== undefined){
let data13 = data.maxRequestPathCodePoints;
if((!(((typeof data13 == "number") && (!(data13 % 1) && !isNaN(data13))) && (isFinite(data13)))) && (data13 !== null)){
const err40 = {instancePath:instancePath+"/maxRequestPathCodePoints",schemaPath:"#/properties/maxRequestPathCodePoints/type",keyword:"type",params:{type: schema20.properties.maxRequestPathCodePoints.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if((typeof data13 == "number") && (isFinite(data13))){
if(data13 > 9007199254740991 || isNaN(data13)){
const err41 = {instancePath:instancePath+"/maxRequestPathCodePoints",schemaPath:"#/properties/maxRequestPathCodePoints/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data13 < 1 || isNaN(data13)){
const err42 = {instancePath:instancePath+"/maxRequestPathCodePoints",schemaPath:"#/properties/maxRequestPathCodePoints/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
}
if(data.maxHumanPathCodePoints !== undefined){
let data14 = data.maxHumanPathCodePoints;
if((!(((typeof data14 == "number") && (!(data14 % 1) && !isNaN(data14))) && (isFinite(data14)))) && (data14 !== null)){
const err43 = {instancePath:instancePath+"/maxHumanPathCodePoints",schemaPath:"#/properties/maxHumanPathCodePoints/type",keyword:"type",params:{type: schema20.properties.maxHumanPathCodePoints.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if((typeof data14 == "number") && (isFinite(data14))){
if(data14 > 9007199254740991 || isNaN(data14)){
const err44 = {instancePath:instancePath+"/maxHumanPathCodePoints",schemaPath:"#/properties/maxHumanPathCodePoints/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data14 < 1 || isNaN(data14)){
const err45 = {instancePath:instancePath+"/maxHumanPathCodePoints",schemaPath:"#/properties/maxHumanPathCodePoints/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
}
if(data.maxHumanPointerCodePoints !== undefined){
let data15 = data.maxHumanPointerCodePoints;
if((!(((typeof data15 == "number") && (!(data15 % 1) && !isNaN(data15))) && (isFinite(data15)))) && (data15 !== null)){
const err46 = {instancePath:instancePath+"/maxHumanPointerCodePoints",schemaPath:"#/properties/maxHumanPointerCodePoints/type",keyword:"type",params:{type: schema20.properties.maxHumanPointerCodePoints.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
if((typeof data15 == "number") && (isFinite(data15))){
if(data15 > 9007199254740991 || isNaN(data15)){
const err47 = {instancePath:instancePath+"/maxHumanPointerCodePoints",schemaPath:"#/properties/maxHumanPointerCodePoints/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(data15 < 1 || isNaN(data15)){
const err48 = {instancePath:instancePath+"/maxHumanPointerCodePoints",schemaPath:"#/properties/maxHumanPointerCodePoints/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
}
}
else {
const err49 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
validate74.errors = vErrors;
return errors === 0;
}
validate74.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate76(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate76.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(Array.isArray(data)){
if(data.length < 1){
const err0 = {instancePath,schemaPath:"#/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
let data0 = data[i0];
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
if(data0.pointer === undefined){
const err1 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/required",keyword:"required",params:{missingProperty: "pointer"},message:"must have required property '"+"pointer"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data0.sha256 === undefined){
const err2 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/required",keyword:"required",params:{missingProperty: "sha256"},message:"must have required property '"+"sha256"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0.byteLength === undefined){
const err3 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/required",keyword:"required",params:{missingProperty: "byteLength"},message:"must have required property '"+"byteLength"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data0){
if(!((((key0 === "pointer") || (key0 === "sha256")) || (key0 === "byteLength")) || (key0 === "record"))){
const err4 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data0.pointer !== undefined){
let data1 = data0.pointer;
if(typeof data1 === "string"){
if(!pattern7.test(data1)){
const err5 = {instancePath:instancePath+"/" + i0+"/pointer",schemaPath:"#/items/properties/pointer/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*$"+"\""};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
else {
const err6 = {instancePath:instancePath+"/" + i0+"/pointer",schemaPath:"#/items/properties/pointer/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data0.sha256 !== undefined){
let data2 = data0.sha256;
if(typeof data2 === "string"){
if(!pattern8.test(data2)){
const err7 = {instancePath:instancePath+"/" + i0+"/sha256",schemaPath:"#/items/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/" + i0+"/sha256",schemaPath:"#/items/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data0.byteLength !== undefined){
if(!(validate56(data0.byteLength, {instancePath:instancePath+"/" + i0+"/byteLength",parentData:data0,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data0.record !== undefined){
let data4 = data0.record;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.pointer === undefined){
const err9 = {instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/required",keyword:"required",params:{missingProperty: "pointer"},message:"must have required property '"+"pointer"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data4.value === undefined){
const err10 = {instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
for(const key1 in data4){
if(!((key1 === "pointer") || (key1 === "value"))){
const err11 = {instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data4.pointer !== undefined){
let data5 = data4.pointer;
if(typeof data5 === "string"){
if(!pattern7.test(data5)){
const err12 = {instancePath:instancePath+"/" + i0+"/record/pointer",schemaPath:"#/items/properties/record/properties/pointer/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/" + i0+"/record/pointer",schemaPath:"#/items/properties/record/properties/pointer/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data4.value !== undefined){
let data6 = data4.value;
if(typeof data6 === "string"){
if(func1(data6) < 1){
const err14 = {instancePath:instancePath+"/" + i0+"/record/value",schemaPath:"#/items/properties/record/properties/value/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/" + i0+"/record/value",schemaPath:"#/items/properties/record/properties/value/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath:instancePath+"/" + i0+"/record",schemaPath:"#/items/properties/record/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath:instancePath+"/" + i0,schemaPath:"#/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
const duplicates0 = func8(data);
if(duplicates0 !== null){
const err18 = {instancePath,schemaPath:"#/uniqueItems",keyword:"uniqueItems",params:{i: duplicates0[0], j: duplicates0[1]},message:"must NOT have duplicate items (items ## "+duplicates0[1]+" and "+duplicates0[0]+" are identical)"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
else {
const err19 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
validate76.errors = vErrors;
return errors === 0;
}
validate76.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};


function validate79(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate79.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(typeof data === "string"){
if(func1(data) > 20){
const err0 = {instancePath,schemaPath:"#/maxLength",keyword:"maxLength",params:{limit: 20},message:"must NOT have more than 20 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(!pattern14.test(data)){
const err1 = {instancePath,schemaPath:"#/pattern",keyword:"pattern",params:{pattern: "^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"},message:"must match pattern \""+"^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"+"\""};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
else {
const err2 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
validate79.errors = vErrors;
return errors === 0;
}
validate79.evaluated = {"dynamicProps":false,"dynamicItems":false};


function validate82(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate82.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.phase === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "phase"},message:"must have required property '"+"phase"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.ruleId === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "ruleId"},message:"must have required property '"+"ruleId"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.messageId === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "messageId"},message:"must have required property '"+"messageId"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.line === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "line"},message:"must have required property '"+"line"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.column === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "column"},message:"must have required property '"+"column"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.severity === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "severity"},message:"must have required property '"+"severity"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.endLine === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "endLine"},message:"must have required property '"+"endLine"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.endColumn === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "endColumn"},message:"must have required property '"+"endColumn"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
for(const key0 in data){
if(!(func3.call(schema24.properties, key0))){
const err8 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.phase !== undefined){
let data0 = data.phase;
if(!((((data0 === "bytes") || (data0 === "syntax")) || (data0 === "lint")) || (data0 === "framing"))){
const err9 = {instancePath:instancePath+"/phase",schemaPath:"#/properties/phase/enum",keyword:"enum",params:{allowedValues: schema24.properties.phase.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.ruleId !== undefined){
let data1 = data.ruleId;
if((typeof data1 !== "string") && (data1 !== null)){
const err10 = {instancePath:instancePath+"/ruleId",schemaPath:"#/properties/ruleId/type",keyword:"type",params:{type: schema24.properties.ruleId.type},message:"must be string,null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.messageId !== undefined){
let data2 = data.messageId;
if(typeof data2 === "string"){
if(func1(data2) < 1){
const err11 = {instancePath:instancePath+"/messageId",schemaPath:"#/properties/messageId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
else {
const err12 = {instancePath:instancePath+"/messageId",schemaPath:"#/properties/messageId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.line !== undefined){
if(!(validate56(data.line, {instancePath:instancePath+"/line",parentData:data,parentDataProperty:"line",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.column !== undefined){
if(!(validate56(data.column, {instancePath:instancePath+"/column",parentData:data,parentDataProperty:"column",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.endLine !== undefined){
if(!(validate56(data.endLine, {instancePath:instancePath+"/endLine",parentData:data,parentDataProperty:"endLine",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.endColumn !== undefined){
if(!(validate56(data.endColumn, {instancePath:instancePath+"/endColumn",parentData:data,parentDataProperty:"endColumn",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.record !== undefined){
if(!(validate56(data.record, {instancePath:instancePath+"/record",parentData:data,parentDataProperty:"record",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
if(data.severity !== undefined){
if("error" !== data.severity){
const err13 = {instancePath:instancePath+"/severity",schemaPath:"#/properties/severity/const",keyword:"const",params:{allowedValue: "error"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.codePoint !== undefined){
let data9 = data.codePoint;
if(typeof data9 === "string"){
if(!pattern16.test(data9)){
const err14 = {instancePath:instancePath+"/codePoint",schemaPath:"#/properties/codePoint/pattern",keyword:"pattern",params:{pattern: "^U\\+[0-9A-F]{4,6}$"},message:"must match pattern \""+"^U\\+[0-9A-F]{4,6}$"+"\""};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/codePoint",schemaPath:"#/properties/codePoint/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
validate82.errors = vErrors;
return errors === 0;
}
validate82.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate89(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate89.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
if(!(((((key0 === "maxManagedMemoryBytes") || (key0 === "maxTemporaryBytes")) || (key0 === "maxNestingDepth")) || (key0 === "maxCheckTimeMs")) || (key0 === "terminationGraceMs"))){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
if(data.maxManagedMemoryBytes !== undefined){
let data0 = data.maxManagedMemoryBytes;
if((!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))) && (data0 !== null)){
const err1 = {instancePath:instancePath+"/maxManagedMemoryBytes",schemaPath:"#/properties/maxManagedMemoryBytes/type",keyword:"type",params:{type: schema25.properties.maxManagedMemoryBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if((typeof data0 == "number") && (isFinite(data0))){
if(data0 > 9007199254740991 || isNaN(data0)){
const err2 = {instancePath:instancePath+"/maxManagedMemoryBytes",schemaPath:"#/properties/maxManagedMemoryBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0 < 1 || isNaN(data0)){
const err3 = {instancePath:instancePath+"/maxManagedMemoryBytes",schemaPath:"#/properties/maxManagedMemoryBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
if(data.maxTemporaryBytes !== undefined){
let data1 = data.maxTemporaryBytes;
if((!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))) && (data1 !== null)){
const err4 = {instancePath:instancePath+"/maxTemporaryBytes",schemaPath:"#/properties/maxTemporaryBytes/type",keyword:"type",params:{type: schema25.properties.maxTemporaryBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740991 || isNaN(data1)){
const err5 = {instancePath:instancePath+"/maxTemporaryBytes",schemaPath:"#/properties/maxTemporaryBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data1 < 1 || isNaN(data1)){
const err6 = {instancePath:instancePath+"/maxTemporaryBytes",schemaPath:"#/properties/maxTemporaryBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
if(data.maxNestingDepth !== undefined){
let data2 = data.maxNestingDepth;
if((!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))) && (data2 !== null)){
const err7 = {instancePath:instancePath+"/maxNestingDepth",schemaPath:"#/properties/maxNestingDepth/type",keyword:"type",params:{type: schema25.properties.maxNestingDepth.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 9007199254740991 || isNaN(data2)){
const err8 = {instancePath:instancePath+"/maxNestingDepth",schemaPath:"#/properties/maxNestingDepth/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2 < 1 || isNaN(data2)){
const err9 = {instancePath:instancePath+"/maxNestingDepth",schemaPath:"#/properties/maxNestingDepth/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
if(data.maxCheckTimeMs !== undefined){
let data3 = data.maxCheckTimeMs;
if((!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))) && (data3 !== null)){
const err10 = {instancePath:instancePath+"/maxCheckTimeMs",schemaPath:"#/properties/maxCheckTimeMs/type",keyword:"type",params:{type: schema25.properties.maxCheckTimeMs.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 > 9007199254740991 || isNaN(data3)){
const err11 = {instancePath:instancePath+"/maxCheckTimeMs",schemaPath:"#/properties/maxCheckTimeMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3 < 1 || isNaN(data3)){
const err12 = {instancePath:instancePath+"/maxCheckTimeMs",schemaPath:"#/properties/maxCheckTimeMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
if(data.terminationGraceMs !== undefined){
let data4 = data.terminationGraceMs;
if((!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))) && (data4 !== null)){
const err13 = {instancePath:instancePath+"/terminationGraceMs",schemaPath:"#/properties/terminationGraceMs/type",keyword:"type",params:{type: schema25.properties.terminationGraceMs.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740991 || isNaN(data4)){
const err14 = {instancePath:instancePath+"/terminationGraceMs",schemaPath:"#/properties/terminationGraceMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data4 < 1 || isNaN(data4)){
const err15 = {instancePath:instancePath+"/terminationGraceMs",schemaPath:"#/properties/terminationGraceMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
}
else {
const err16 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
validate89.errors = vErrors;
return errors === 0;
}
validate89.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate91(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate91.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
if(!((((key0 === "maximumSourceBytes") || (key0 === "maximumOutputBytes")) || (key0 === "maximumNormalizationChanges")) || (key0 === "maximumWritePaths"))){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
if(data.maximumSourceBytes !== undefined){
let data0 = data.maximumSourceBytes;
if((!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))) && (data0 !== null)){
const err1 = {instancePath:instancePath+"/maximumSourceBytes",schemaPath:"#/properties/maximumSourceBytes/type",keyword:"type",params:{type: schema26.properties.maximumSourceBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if((typeof data0 == "number") && (isFinite(data0))){
if(data0 > 9007199254740991 || isNaN(data0)){
const err2 = {instancePath:instancePath+"/maximumSourceBytes",schemaPath:"#/properties/maximumSourceBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0 < 1 || isNaN(data0)){
const err3 = {instancePath:instancePath+"/maximumSourceBytes",schemaPath:"#/properties/maximumSourceBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
if(data.maximumOutputBytes !== undefined){
let data1 = data.maximumOutputBytes;
if((!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))) && (data1 !== null)){
const err4 = {instancePath:instancePath+"/maximumOutputBytes",schemaPath:"#/properties/maximumOutputBytes/type",keyword:"type",params:{type: schema26.properties.maximumOutputBytes.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740991 || isNaN(data1)){
const err5 = {instancePath:instancePath+"/maximumOutputBytes",schemaPath:"#/properties/maximumOutputBytes/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data1 < 1 || isNaN(data1)){
const err6 = {instancePath:instancePath+"/maximumOutputBytes",schemaPath:"#/properties/maximumOutputBytes/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
if(data.maximumNormalizationChanges !== undefined){
let data2 = data.maximumNormalizationChanges;
if((!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))) && (data2 !== null)){
const err7 = {instancePath:instancePath+"/maximumNormalizationChanges",schemaPath:"#/properties/maximumNormalizationChanges/type",keyword:"type",params:{type: schema26.properties.maximumNormalizationChanges.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 9007199254740991 || isNaN(data2)){
const err8 = {instancePath:instancePath+"/maximumNormalizationChanges",schemaPath:"#/properties/maximumNormalizationChanges/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2 < 1 || isNaN(data2)){
const err9 = {instancePath:instancePath+"/maximumNormalizationChanges",schemaPath:"#/properties/maximumNormalizationChanges/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
if(data.maximumWritePaths !== undefined){
let data3 = data.maximumWritePaths;
if((!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))) && (data3 !== null)){
const err10 = {instancePath:instancePath+"/maximumWritePaths",schemaPath:"#/properties/maximumWritePaths/type",keyword:"type",params:{type: schema26.properties.maximumWritePaths.type},message:"must be integer,null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 > 9007199254740991 || isNaN(data3)){
const err11 = {instancePath:instancePath+"/maximumWritePaths",schemaPath:"#/properties/maximumWritePaths/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3 < 1 || isNaN(data3)){
const err12 = {instancePath:instancePath+"/maximumWritePaths",schemaPath:"#/properties/maximumWritePaths/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
}
else {
const err13 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
validate91.errors = vErrors;
return errors === 0;
}
validate91.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate73(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://github.com/Hadden-Industries/json-quality/schema/effective-policy/v4" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate73.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schemaVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.defaults === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "defaults"},message:"must have required property '"+"defaults"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.exceptions === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "exceptions"},message:"must have required property '"+"exceptions"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!((((((((key0 === "preserveSourcePresentation") || (key0 === "capacityLimits")) || (key0 === "schemaVersion")) || (key0 === "defaults")) || (key0 === "exceptions")) || (key0 === "nativeSources")) || (key0 === "runtimeControls")) || (key0 === "transformControls"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.preserveSourcePresentation !== undefined){
let data0 = data.preserveSourcePresentation;
if(Array.isArray(data0)){
if(data0.length < 1){
const err4 = {instancePath:instancePath+"/preserveSourcePresentation",schemaPath:"#/properties/preserveSourcePresentation/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
let data1 = data0[i0];
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
if(data1.paths === undefined){
const err5 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/required",keyword:"required",params:{missingProperty: "paths"},message:"must have required property '"+"paths"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data1.owner === undefined){
const err6 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/required",keyword:"required",params:{missingProperty: "owner"},message:"must have required property '"+"owner"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data1.reason === undefined){
const err7 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
for(const key1 in data1){
if(!(((key1 === "paths") || (key1 === "owner")) || (key1 === "reason"))){
const err8 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data1.paths !== undefined){
let data2 = data1.paths;
if(Array.isArray(data2)){
if(data2.length < 1){
const err9 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths",schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
const len1 = data2.length;
for(let i1=0; i1<len1; i1++){
let data3 = data2[i1];
if(typeof data3 === "string"){
if(func1(data3) < 1){
const err10 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths/" + i1,schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/items/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths/" + i1,schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
let i2 = data2.length;
let j0;
if(i2 > 1){
const indices0 = {};
for(;i2--;){
let item0 = data2[i2];
if(typeof item0 !== "string"){
continue;
}
if(typeof indices0[item0] == "number"){
j0 = indices0[item0];
const err12 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths",schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/uniqueItems",keyword:"uniqueItems",params:{i: i2, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i2+" are identical)"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
break;
}
indices0[item0] = i2;
}
}
}
else {
const err13 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/paths",schemaPath:"#/properties/preserveSourcePresentation/items/properties/paths/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data1.owner !== undefined){
let data4 = data1.owner;
if(typeof data4 === "string"){
if(!pattern3.test(data4)){
const err14 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/owner",schemaPath:"#/properties/preserveSourcePresentation/items/properties/owner/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/owner",schemaPath:"#/properties/preserveSourcePresentation/items/properties/owner/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data1.reason !== undefined){
let data5 = data1.reason;
if(typeof data5 === "string"){
if(!pattern3.test(data5)){
const err16 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/reason",schemaPath:"#/properties/preserveSourcePresentation/items/properties/reason/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
else {
const err17 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0+"/reason",schemaPath:"#/properties/preserveSourcePresentation/items/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath:instancePath+"/preserveSourcePresentation/" + i0,schemaPath:"#/properties/preserveSourcePresentation/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
let i3 = data0.length;
let j1;
if(i3 > 1){
outer0:
for(;i3--;){
for(j1 = i3; j1--;){
if(func0(data0[i3], data0[j1])){
const err19 = {instancePath:instancePath+"/preserveSourcePresentation",schemaPath:"#/properties/preserveSourcePresentation/uniqueItems",keyword:"uniqueItems",params:{i: i3, j: j1},message:"must NOT have duplicate items (items ## "+j1+" and "+i3+" are identical)"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
break outer0;
}
}
}
}
}
else {
const err20 = {instancePath:instancePath+"/preserveSourcePresentation",schemaPath:"#/properties/preserveSourcePresentation/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.capacityLimits !== undefined){
let data6 = data.capacityLimits;
const _errs16 = errors;
let valid8 = false;
const _errs17 = errors;
if(typeof data6 !== "boolean"){
const err21 = {instancePath:instancePath+"/capacityLimits",schemaPath:"#/properties/capacityLimits/anyOf/0/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
var _valid0 = _errs17 === errors;
valid8 = valid8 || _valid0;
const _errs19 = errors;
if(!(validate74(data6, {instancePath:instancePath+"/capacityLimits",parentData:data,parentDataProperty:"capacityLimits",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate74.errors : vErrors.concat(validate74.errors);
errors = vErrors.length;
}
var _valid0 = _errs19 === errors;
valid8 = valid8 || _valid0;
if(!valid8){
const err22 = {instancePath:instancePath+"/capacityLimits",schemaPath:"#/properties/capacityLimits/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
else {
errors = _errs16;
if(vErrors !== null){
if(_errs16){
vErrors.length = _errs16;
}
else {
vErrors = null;
}
}
}
}
if(data.schemaVersion !== undefined){
if(4 !== data.schemaVersion){
const err23 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 4},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data.defaults !== undefined){
let data8 = data.defaults;
if(data8 && typeof data8 == "object" && !Array.isArray(data8)){
if(data8.formatContract === undefined){
const err24 = {instancePath:instancePath+"/defaults",schemaPath:"#/properties/defaults/required",keyword:"required",params:{missingProperty: "formatContract"},message:"must have required property '"+"formatContract"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data8.allowSourceRewrites === undefined){
const err25 = {instancePath:instancePath+"/defaults",schemaPath:"#/properties/defaults/required",keyword:"required",params:{missingProperty: "allowSourceRewrites"},message:"must have required property '"+"allowSourceRewrites"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data8.normalization === undefined){
const err26 = {instancePath:instancePath+"/defaults",schemaPath:"#/properties/defaults/required",keyword:"required",params:{missingProperty: "normalization"},message:"must have required property '"+"normalization"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
for(const key2 in data8){
if(!(((key2 === "formatContract") || (key2 === "allowSourceRewrites")) || (key2 === "normalization"))){
const err27 = {instancePath:instancePath+"/defaults",schemaPath:"#/properties/defaults/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data8.formatContract !== undefined){
if("prettier-json" !== data8.formatContract){
const err28 = {instancePath:instancePath+"/defaults/formatContract",schemaPath:"#/properties/defaults/properties/formatContract/const",keyword:"const",params:{allowedValue: "prettier-json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data8.allowSourceRewrites !== undefined){
if(true !== data8.allowSourceRewrites){
const err29 = {instancePath:instancePath+"/defaults/allowSourceRewrites",schemaPath:"#/properties/defaults/properties/allowSourceRewrites/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data8.normalization !== undefined){
let data11 = data8.normalization;
if(!((data11 === "NFC") || (data11 === "preserve"))){
const err30 = {instancePath:instancePath+"/defaults/normalization",schemaPath:"#/properties/defaults/properties/normalization/enum",keyword:"enum",params:{allowedValues: schema27.properties.defaults.properties.normalization.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
}
else {
const err31 = {instancePath:instancePath+"/defaults",schemaPath:"#/properties/defaults/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data.exceptions !== undefined){
let data12 = data.exceptions;
if(Array.isArray(data12)){
const len2 = data12.length;
for(let i4=0; i4<len2; i4++){
let data13 = data12[i4];
if(data13 && typeof data13 == "object" && !Array.isArray(data13)){
if(Object.keys(data13).length < 4){
const err32 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/minProperties",keyword:"minProperties",params:{limit: 4},message:"must NOT have fewer than 4 properties"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data13.paths === undefined){
const err33 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/required",keyword:"required",params:{missingProperty: "paths"},message:"must have required property '"+"paths"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data13.owner === undefined){
const err34 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/required",keyword:"required",params:{missingProperty: "owner"},message:"must have required property '"+"owner"+"'"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(data13.reason === undefined){
const err35 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
for(const key3 in data13){
if(!(func3.call(schema27.properties.exceptions.items.properties, key3))){
const err36 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data13.paths !== undefined){
let data14 = data13.paths;
if(Array.isArray(data14)){
if(data14.length < 1){
const err37 = {instancePath:instancePath+"/exceptions/" + i4+"/paths",schemaPath:"#/properties/exceptions/items/properties/paths/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
const len3 = data14.length;
for(let i5=0; i5<len3; i5++){
let data15 = data14[i5];
if(typeof data15 === "string"){
if(func1(data15) < 1){
const err38 = {instancePath:instancePath+"/exceptions/" + i4+"/paths/" + i5,schemaPath:"#/properties/exceptions/items/properties/paths/items/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
else {
const err39 = {instancePath:instancePath+"/exceptions/" + i4+"/paths/" + i5,schemaPath:"#/properties/exceptions/items/properties/paths/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
let i6 = data14.length;
let j2;
if(i6 > 1){
const indices1 = {};
for(;i6--;){
let item1 = data14[i6];
if(typeof item1 !== "string"){
continue;
}
if(typeof indices1[item1] == "number"){
j2 = indices1[item1];
const err40 = {instancePath:instancePath+"/exceptions/" + i4+"/paths",schemaPath:"#/properties/exceptions/items/properties/paths/uniqueItems",keyword:"uniqueItems",params:{i: i6, j: j2},message:"must NOT have duplicate items (items ## "+j2+" and "+i6+" are identical)"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
break;
}
indices1[item1] = i6;
}
}
}
else {
const err41 = {instancePath:instancePath+"/exceptions/" + i4+"/paths",schemaPath:"#/properties/exceptions/items/properties/paths/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
if(data13.owner !== undefined){
let data16 = data13.owner;
if(typeof data16 === "string"){
if(!pattern3.test(data16)){
const err42 = {instancePath:instancePath+"/exceptions/" + i4+"/owner",schemaPath:"#/properties/exceptions/items/properties/owner/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
else {
const err43 = {instancePath:instancePath+"/exceptions/" + i4+"/owner",schemaPath:"#/properties/exceptions/items/properties/owner/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data13.reason !== undefined){
let data17 = data13.reason;
if(typeof data17 === "string"){
if(!pattern3.test(data17)){
const err44 = {instancePath:instancePath+"/exceptions/" + i4+"/reason",schemaPath:"#/properties/exceptions/items/properties/reason/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
else {
const err45 = {instancePath:instancePath+"/exceptions/" + i4+"/reason",schemaPath:"#/properties/exceptions/items/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
if(data13.excludeUntrackedSources !== undefined){
if(true !== data13.excludeUntrackedSources){
const err46 = {instancePath:instancePath+"/exceptions/" + i4+"/excludeUntrackedSources",schemaPath:"#/properties/exceptions/items/properties/excludeUntrackedSources/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data13.allowSourceRewrites !== undefined){
if(false !== data13.allowSourceRewrites){
const err47 = {instancePath:instancePath+"/exceptions/" + i4+"/allowSourceRewrites",schemaPath:"#/properties/exceptions/items/properties/allowSourceRewrites/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data13.normalization !== undefined){
let data20 = data13.normalization;
if(!((data20 === "NFC") || (data20 === "preserve"))){
const err48 = {instancePath:instancePath+"/exceptions/" + i4+"/normalization",schemaPath:"#/properties/exceptions/items/properties/normalization/enum",keyword:"enum",params:{allowedValues: schema27.properties.exceptions.items.properties.normalization.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data13.nfcExemptStringValues !== undefined){
if(!(validate76(data13.nfcExemptStringValues, {instancePath:instancePath+"/exceptions/" + i4+"/nfcExemptStringValues",parentData:data13,parentDataProperty:"nfcExemptStringValues",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate76.errors : vErrors.concat(validate76.errors);
errors = vErrors.length;
}
}
if(data13.allowEmptyKeys !== undefined){
let data22 = data13.allowEmptyKeys;
if(Array.isArray(data22)){
if(data22.length < 1){
const err49 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys",schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
const len4 = data22.length;
for(let i7=0; i7<len4; i7++){
let data23 = data22[i7];
if(typeof data23 === "string"){
if(!pattern11.test(data23)){
const err50 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys/" + i7,schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/items/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*/$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*/$"+"\""};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
else {
const err51 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys/" + i7,schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
let i8 = data22.length;
let j3;
if(i8 > 1){
const indices2 = {};
for(;i8--;){
let item2 = data22[i8];
if(typeof item2 !== "string"){
continue;
}
if(typeof indices2[item2] == "number"){
j3 = indices2[item2];
const err52 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys",schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/uniqueItems",keyword:"uniqueItems",params:{i: i8, j: j3},message:"must NOT have duplicate items (items ## "+j3+" and "+i8+" are identical)"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
break;
}
indices2[item2] = i8;
}
}
}
else {
const err53 = {instancePath:instancePath+"/exceptions/" + i4+"/allowEmptyKeys",schemaPath:"#/properties/exceptions/items/properties/allowEmptyKeys/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data13.formatContract !== undefined){
let data24 = data13.formatContract;
if(!(((((((data24 === "prettier-json") || (data24 === "producer-json-body")) || (data24 === "producer-json-indent")) || (data24 === "producer-json-indent-body")) || (data24 === "producer-json-compact")) || (data24 === "producer-json-compact-body")) || (data24 === "preserved-bytes"))){
const err54 = {instancePath:instancePath+"/exceptions/" + i4+"/formatContract",schemaPath:"#/properties/exceptions/items/properties/formatContract/enum",keyword:"enum",params:{allowedValues: schema27.properties.exceptions.items.properties.formatContract.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
if(data13.expected !== undefined){
let data25 = data13.expected;
if(data25 && typeof data25 == "object" && !Array.isArray(data25)){
if(data25.sha256 === undefined){
const err55 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/required",keyword:"required",params:{missingProperty: "sha256"},message:"must have required property '"+"sha256"+"'"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
if(data25.byteLength === undefined){
const err56 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/required",keyword:"required",params:{missingProperty: "byteLength"},message:"must have required property '"+"byteLength"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data25.diagnostics === undefined){
const err57 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/required",keyword:"required",params:{missingProperty: "diagnostics"},message:"must have required property '"+"diagnostics"+"'"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
for(const key4 in data25){
if(!((((key4 === "linkedDocuments") || (key4 === "sha256")) || (key4 === "byteLength")) || (key4 === "diagnostics"))){
const err58 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data25.linkedDocuments !== undefined){
let data26 = data25.linkedDocuments;
if(Array.isArray(data26)){
if(data26.length < 1){
const err59 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
const len5 = data26.length;
for(let i9=0; i9<len5; i9++){
let data27 = data26[i9];
if(data27 && typeof data27 == "object" && !Array.isArray(data27)){
if(data27.path === undefined){
const err60 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
if(data27.pointer === undefined){
const err61 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "pointer"},message:"must have required property '"+"pointer"+"'"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
if(data27.encoding === undefined){
const err62 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "encoding"},message:"must have required property '"+"encoding"+"'"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
if(data27.sha256 === undefined){
const err63 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "sha256"},message:"must have required property '"+"sha256"+"'"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
if(data27.byteLength === undefined){
const err64 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/required",keyword:"required",params:{missingProperty: "byteLength"},message:"must have required property '"+"byteLength"+"'"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
for(const key5 in data27){
if(!(((((key5 === "path") || (key5 === "pointer")) || (key5 === "encoding")) || (key5 === "sha256")) || (key5 === "byteLength"))){
const err65 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
if(data27.path !== undefined){
let data28 = data27.path;
if(typeof data28 === "string"){
if(func1(data28) < 1){
const err66 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/path",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/path/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
else {
const err67 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/path",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/path/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
}
if(data27.pointer !== undefined){
let data29 = data27.pointer;
if(typeof data29 === "string"){
if(!pattern7.test(data29)){
const err68 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/pointer",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/pointer/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*$"+"\""};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
}
else {
const err69 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/pointer",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/pointer/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
}
if(data27.encoding !== undefined){
let data30 = data27.encoding;
if(!((data30 === "utf8") || (data30 === "base64"))){
const err70 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/encoding",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/encoding/enum",keyword:"enum",params:{allowedValues: schema27.properties.exceptions.items.properties.expected.properties.linkedDocuments.items.properties.encoding.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
}
if(data27.sha256 !== undefined){
let data31 = data27.sha256;
if(typeof data31 === "string"){
if(!pattern8.test(data31)){
const err71 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/sha256",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
else {
const err72 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/sha256",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
}
if(data27.byteLength !== undefined){
if(!(validate79(data27.byteLength, {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9+"/byteLength",parentData:data27,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
errors = vErrors.length;
}
}
}
else {
const err73 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments/" + i9,schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
let i10 = data26.length;
let j4;
if(i10 > 1){
outer1:
for(;i10--;){
for(j4 = i10; j4--;){
if(func0(data26[i10], data26[j4])){
const err74 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/uniqueItems",keyword:"uniqueItems",params:{i: i10, j: j4},message:"must NOT have duplicate items (items ## "+j4+" and "+i10+" are identical)"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
break outer1;
}
}
}
}
}
else {
const err75 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/linkedDocuments",schemaPath:"#/properties/exceptions/items/properties/expected/properties/linkedDocuments/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
if(data25.sha256 !== undefined){
let data33 = data25.sha256;
if(typeof data33 === "string"){
if(!pattern8.test(data33)){
const err76 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/sha256",schemaPath:"#/properties/exceptions/items/properties/expected/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
else {
const err77 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/sha256",schemaPath:"#/properties/exceptions/items/properties/expected/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
if(data25.byteLength !== undefined){
if(!(validate79(data25.byteLength, {instancePath:instancePath+"/exceptions/" + i4+"/expected/byteLength",parentData:data25,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
errors = vErrors.length;
}
}
if(data25.diagnostics !== undefined){
let data35 = data25.diagnostics;
if(Array.isArray(data35)){
const len6 = data35.length;
for(let i11=0; i11<len6; i11++){
if(!(validate82(data35[i11], {instancePath:instancePath+"/exceptions/" + i4+"/expected/diagnostics/" + i11,parentData:data35,parentDataProperty:i11,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate82.errors : vErrors.concat(validate82.errors);
errors = vErrors.length;
}
}
let i12 = data35.length;
let j5;
if(i12 > 1){
outer2:
for(;i12--;){
for(j5 = i12; j5--;){
if(func0(data35[i12], data35[j5])){
const err78 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/diagnostics",schemaPath:"#/properties/exceptions/items/properties/expected/properties/diagnostics/uniqueItems",keyword:"uniqueItems",params:{i: i12, j: j5},message:"must NOT have duplicate items (items ## "+j5+" and "+i12+" are identical)"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
break outer2;
}
}
}
}
}
else {
const err79 = {instancePath:instancePath+"/exceptions/" + i4+"/expected/diagnostics",schemaPath:"#/properties/exceptions/items/properties/expected/properties/diagnostics/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
}
else {
const err80 = {instancePath:instancePath+"/exceptions/" + i4+"/expected",schemaPath:"#/properties/exceptions/items/properties/expected/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
}
}
else {
const err81 = {instancePath:instancePath+"/exceptions/" + i4,schemaPath:"#/properties/exceptions/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
}
let i13 = data12.length;
let j6;
if(i13 > 1){
outer3:
for(;i13--;){
for(j6 = i13; j6--;){
if(func0(data12[i13], data12[j6])){
const err82 = {instancePath:instancePath+"/exceptions",schemaPath:"#/properties/exceptions/uniqueItems",keyword:"uniqueItems",params:{i: i13, j: j6},message:"must NOT have duplicate items (items ## "+j6+" and "+i13+" are identical)"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
break outer3;
}
}
}
}
}
else {
const err83 = {instancePath:instancePath+"/exceptions",schemaPath:"#/properties/exceptions/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
}
if(data.nativeSources !== undefined){
let data37 = data.nativeSources;
if(Array.isArray(data37)){
const len7 = data37.length;
for(let i14=0; i14<len7; i14++){
let data38 = data37[i14];
if(data38 && typeof data38 == "object" && !Array.isArray(data38)){
if(data38.id === undefined){
const err84 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
if(data38.provider === undefined){
const err85 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/required",keyword:"required",params:{missingProperty: "provider"},message:"must have required property '"+"provider"+"'"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
if(data38.owner === undefined){
const err86 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/required",keyword:"required",params:{missingProperty: "owner"},message:"must have required property '"+"owner"+"'"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
if(data38.reason === undefined){
const err87 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
for(const key6 in data38){
if(!(((((((key6 === "id") || (key6 === "provider")) || (key6 === "owner")) || (key6 === "reason")) || (key6 === "parameters")) || (key6 === "minimumDocuments")) || (key6 === "formatContract"))){
const err88 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
}
if(data38.id !== undefined){
let data39 = data38.id;
if(typeof data39 === "string"){
if(!pattern17.test(data39)){
const err89 = {instancePath:instancePath+"/nativeSources/" + i14+"/id",schemaPath:"#/properties/nativeSources/items/properties/id/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z][A-Za-z0-9_-]*$"},message:"must match pattern \""+"^[A-Za-z][A-Za-z0-9_-]*$"+"\""};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
else {
const err90 = {instancePath:instancePath+"/nativeSources/" + i14+"/id",schemaPath:"#/properties/nativeSources/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
}
if(data38.provider !== undefined){
let data40 = data38.provider;
if(typeof data40 === "string"){
if(!pattern17.test(data40)){
const err91 = {instancePath:instancePath+"/nativeSources/" + i14+"/provider",schemaPath:"#/properties/nativeSources/items/properties/provider/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z][A-Za-z0-9_-]*$"},message:"must match pattern \""+"^[A-Za-z][A-Za-z0-9_-]*$"+"\""};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
}
else {
const err92 = {instancePath:instancePath+"/nativeSources/" + i14+"/provider",schemaPath:"#/properties/nativeSources/items/properties/provider/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
}
if(data38.owner !== undefined){
let data41 = data38.owner;
if(typeof data41 === "string"){
if(!pattern3.test(data41)){
const err93 = {instancePath:instancePath+"/nativeSources/" + i14+"/owner",schemaPath:"#/properties/nativeSources/items/properties/owner/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
}
else {
const err94 = {instancePath:instancePath+"/nativeSources/" + i14+"/owner",schemaPath:"#/properties/nativeSources/items/properties/owner/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
}
if(data38.reason !== undefined){
let data42 = data38.reason;
if(typeof data42 === "string"){
if(!pattern3.test(data42)){
const err95 = {instancePath:instancePath+"/nativeSources/" + i14+"/reason",schemaPath:"#/properties/nativeSources/items/properties/reason/pattern",keyword:"pattern",params:{pattern: "\\S"},message:"must match pattern \""+"\\S"+"\""};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
}
else {
const err96 = {instancePath:instancePath+"/nativeSources/" + i14+"/reason",schemaPath:"#/properties/nativeSources/items/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
}
if(data38.parameters !== undefined){
let data43 = data38.parameters;
if(!(data43 && typeof data43 == "object" && !Array.isArray(data43))){
const err97 = {instancePath:instancePath+"/nativeSources/" + i14+"/parameters",schemaPath:"#/properties/nativeSources/items/properties/parameters/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
}
if(data38.minimumDocuments !== undefined){
let data44 = data38.minimumDocuments;
if(!(((typeof data44 == "number") && (!(data44 % 1) && !isNaN(data44))) && (isFinite(data44)))){
const err98 = {instancePath:instancePath+"/nativeSources/" + i14+"/minimumDocuments",schemaPath:"#/properties/nativeSources/items/properties/minimumDocuments/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
if((typeof data44 == "number") && (isFinite(data44))){
if(data44 < 0 || isNaN(data44)){
const err99 = {instancePath:instancePath+"/nativeSources/" + i14+"/minimumDocuments",schemaPath:"#/properties/nativeSources/items/properties/minimumDocuments/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
}
}
if(data38.formatContract !== undefined){
let data45 = data38.formatContract;
if(!((((((data45 === "prettier-json") || (data45 === "producer-json-body")) || (data45 === "producer-json-indent")) || (data45 === "producer-json-indent-body")) || (data45 === "producer-json-compact")) || (data45 === "producer-json-compact-body"))){
const err100 = {instancePath:instancePath+"/nativeSources/" + i14+"/formatContract",schemaPath:"#/properties/nativeSources/items/properties/formatContract/enum",keyword:"enum",params:{allowedValues: schema27.properties.nativeSources.items.properties.formatContract.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
}
}
else {
const err101 = {instancePath:instancePath+"/nativeSources/" + i14,schemaPath:"#/properties/nativeSources/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
}
}
else {
const err102 = {instancePath:instancePath+"/nativeSources",schemaPath:"#/properties/nativeSources/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
}
}
if(data.runtimeControls !== undefined){
let data46 = data.runtimeControls;
const _errs90 = errors;
let valid31 = false;
const _errs91 = errors;
if(typeof data46 !== "boolean"){
const err103 = {instancePath:instancePath+"/runtimeControls",schemaPath:"#/properties/runtimeControls/anyOf/0/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
}
var _valid1 = _errs91 === errors;
valid31 = valid31 || _valid1;
const _errs93 = errors;
if(!(validate89(data46, {instancePath:instancePath+"/runtimeControls",parentData:data,parentDataProperty:"runtimeControls",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate89.errors : vErrors.concat(validate89.errors);
errors = vErrors.length;
}
var _valid1 = _errs93 === errors;
valid31 = valid31 || _valid1;
if(!valid31){
const err104 = {instancePath:instancePath+"/runtimeControls",schemaPath:"#/properties/runtimeControls/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
else {
errors = _errs90;
if(vErrors !== null){
if(_errs90){
vErrors.length = _errs90;
}
else {
vErrors = null;
}
}
}
}
if(data.transformControls !== undefined){
let data47 = data.transformControls;
const _errs95 = errors;
let valid32 = false;
const _errs96 = errors;
if(typeof data47 !== "boolean"){
const err105 = {instancePath:instancePath+"/transformControls",schemaPath:"#/properties/transformControls/anyOf/0/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
var _valid2 = _errs96 === errors;
valid32 = valid32 || _valid2;
const _errs98 = errors;
if(!(validate91(data47, {instancePath:instancePath+"/transformControls",parentData:data,parentDataProperty:"transformControls",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate91.errors : vErrors.concat(validate91.errors);
errors = vErrors.length;
}
var _valid2 = _errs98 === errors;
valid32 = valid32 || _valid2;
if(!valid32){
const err106 = {instancePath:instancePath+"/transformControls",schemaPath:"#/properties/transformControls/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
else {
errors = _errs95;
if(vErrors !== null){
if(_errs95){
vErrors.length = _errs95;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err107 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
validate73.errors = vErrors;
return errors === 0;
}
validate73.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

