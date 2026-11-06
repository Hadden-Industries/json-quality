// SPDX-License-Identifier: AGPL-3.0-only
// @ts-nocheck
// Generated from exported schemas; run npm run build:validators.
"use strict";
exports.validateEvent = validate52;
const schema19 = {"title":"JSON Quality event, schema 5","description":"One delivered event. Absence of the applicable terminal means incomplete delivery. Serialized reference identities are labels, never access capabilities.","type":"object","additionalProperties":false,"required":["schemaVersion","requestId","type"],"properties":{"qualification":{"type":"object","additionalProperties":false,"required":["trustedCommitId","candidateCommitId","scope"],"properties":{"trustedCommitId":{"type":"string","pattern":"^[a-f0-9]{40}$"},"candidateCommitId":{"type":"string","pattern":"^[a-f0-9]{40}$"},"trustedPolicyBlobId":{"type":"string","pattern":"^[a-f0-9]{40}$"},"scope":{"const":"immutable-git-json"}}},"schemaVersion":{"const":5},"requestId":{"type":"string","minLength":1},"type":{"enum":["source","value","finding","terminal","execution","execution-terminal","failure","write-preflight","written","write-terminal","write-failure","nfc-key-collision-risk","normalization-preview-change","normalization-preview-terminal","selection","selection-terminal","format-preview-change","format-preview-terminal"]},"path":{"type":"string","minLength":1},"source":{"$ref":"#/$defs/sourceReference"},"reference":{"$ref":"#/$defs/valueReference"},"value":{"anyOf":[{"$ref":"#/$defs/valueReference"},{"type":"null"}]},"parent":{"anyOf":[{"$ref":"#/$defs/valueReference"},{"type":"null"}]},"name":{"anyOf":[{"$ref":"#/$defs/valueReference"},{"type":"null"}]},"scope":{"enum":["source","candidate"]},"linkedExpectationsComplete":{"type":"boolean"},"byteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"sha256":{"anyOf":[{"type":"string","pattern":"^[a-f0-9]{64}$"},{"type":"null"}]},"ordinal":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"record":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"rawByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"sourceByteOffset":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"nfcByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"closed":{"type":"boolean"},"nfcAvailable":{"type":"boolean"},"valueKind":{"enum":["key","string"]},"kind":{"enum":["string","key","number","true","false","null","array","object"]},"severity":{"const":"error"},"phase":{"enum":["bytes","syntax","lint","framing","expectation","presentation"]},"ruleId":{"type":["string","null"]},"messageId":{"type":"string","minLength":1},"arguments":{"type":"object"},"line":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"column":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"endLine":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"endColumn":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"parserComplete":{"type":"boolean"},"rulesComplete":{"type":"boolean"},"semanticRulesApplicable":{"type":"boolean"},"presentationSelected":{"type":"boolean"},"presentationChecked":{"type":"boolean"},"diagnosticsComplete":{"type":"boolean"},"qualityPassed":{"type":"boolean"},"contractSatisfied":{"type":"boolean"},"inventoryComplete":{"type":"boolean"},"sourceObservationsComplete":{"type":"boolean"},"expectedMatched":{"type":["boolean","null"]},"domainAdmission":{"const":"unassessed"},"domainComplete":{"const":false},"findingCount":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"managedPeakBytes":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"spillTransitionCount":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"scratchPeakBytes":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"inventoryMemberCount":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"recordCount":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},{"type":"null"}]},"sourceSha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"diagnosticSha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"coreSourceInputsSha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"linkage":{"type":"object","additionalProperties":false,"required":["containerSource","value","encoding"],"properties":{"containerSource":{"$ref":"#/$defs/sourceReference"},"value":{"$ref":"#/$defs/valueReference"},"encoding":{"enum":["utf8","base64"]}}},"resources":{"type":"object","additionalProperties":false,"required":["admission","runtime"],"properties":{"admission":{"type":"object","additionalProperties":false,"required":["maxPhysicalAndNativeSources","maxSourceBytes","maxTotalSourceBytes","maxNativeLogicalAndTransformedSources","maxRecords","maxDiagnostics","maxPolicyBytes","maxGitOutputBytes","maxToolOutputBytes","maxToolTimeMs","maxGitTimeMs","maxRequestIdCodePoints","maxRequestBytes","maxRequestPathCodePoints","maxHumanPathCodePoints","maxHumanPointerCodePoints"],"properties":{"maxPhysicalAndNativeSources":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxSourceBytes":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxTotalSourceBytes":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxNativeLogicalAndTransformedSources":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxRecords":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxDiagnostics":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxPolicyBytes":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxGitOutputBytes":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxToolOutputBytes":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxToolTimeMs":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxGitTimeMs":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxRequestIdCodePoints":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxRequestBytes":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxRequestPathCodePoints":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxHumanPathCodePoints":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxHumanPointerCodePoints":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]}}},"runtime":{"type":"object","additionalProperties":false,"required":["maxManagedMemoryBytes","maxTemporaryBytes","maxNestingDepth","maxCheckTimeMs","terminationGraceMs"],"properties":{"maxManagedMemoryBytes":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxTemporaryBytes":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxNestingDepth":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"maxCheckTimeMs":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]},"terminationGraceMs":{"anyOf":[{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},{"type":"null"}]}}}}},"code":{"type":"string","minLength":1,"maxLength":256},"message":{"type":"string","minLength":1},"truncated":{"type":"boolean"},"complete":{"type":"boolean"},"operation":{"enum":["format","normalize"]},"selectedPathCount":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"changedPathCount":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"preflightComplete":{"type":"boolean"},"writesComplete":{"type":"boolean"},"uncertainPath":{"anyOf":[{"type":"string","minLength":1},{"type":"null"}]},"writtenPathCount":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"configurationOrigin":{"oneOf":[{"type":"object","additionalProperties":false,"properties":{"kind":{"const":"repository-file"},"path":{"const":".json-quality.json"}},"required":["kind","path"]},{"type":"object","additionalProperties":false,"properties":{"kind":{"const":"repository-absence"},"path":{"const":".json-quality.json"}},"required":["kind","path"]},{"type":"object","additionalProperties":false,"properties":{"kind":{"const":"git-blob"},"path":{"const":".json-quality.json"},"commitId":{"type":"string","pattern":"^[a-f0-9]{40}$"},"blobId":{"type":"string","pattern":"^[a-f0-9]{40}$"}},"required":["kind","path","commitId","blobId"]},{"type":"object","additionalProperties":false,"properties":{"kind":{"const":"git-absence"},"path":{"const":".json-quality.json"},"commitId":{"type":"string","pattern":"^[a-f0-9]{40}$"}},"required":["kind","path","commitId"]}]},"defaultPolicySha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"policyResolverInputsSha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"configurationBytesSha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"policyInputsSha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"configurationByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"formatEligible":{"type":"boolean"},"normalizeEligible":{"type":"boolean"},"containerValue":{"$ref":"#/$defs/valueReference"},"priorValue":{"$ref":"#/$defs/valueReference"},"priorLine":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"priorColumn":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"priorEndLine":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"priorEndColumn":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"normalizedSha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"normalizedByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"sourceByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"pointer":{"type":"string","pattern":"^(?:/(?:[^~/]|~[01])*)*$"},"icuVersion":{"type":"string","minLength":1},"unicodeVersion":{"type":"string","minLength":1},"decodedByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"decodedSha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"operationScope":{"type":"object","additionalProperties":false,"required":["kind","policy","completeRepositoryCheck"],"properties":{"kind":{"enum":["repository","selected-files","stdin","immutable-git-json"]},"policy":{"enum":["repository","explicit-contract","trusted-git"]},"completeRepositoryCheck":{"type":"boolean"}},"oneOf":[{"properties":{"kind":{"const":"repository"},"policy":{"const":"repository"}}},{"properties":{"kind":{"const":"selected-files"},"policy":{"const":"repository"},"completeRepositoryCheck":{"const":false}}},{"properties":{"kind":{"const":"stdin"},"policy":{"enum":["repository","explicit-contract"]},"completeRepositoryCheck":{"const":false}}},{"properties":{"kind":{"const":"immutable-git-json"},"policy":{"const":"trusted-git"},"completeRepositoryCheck":{"const":false}}}]},"root":{"type":"string","minLength":1},"inputKind":{"enum":["physical","stdin"]},"selectedSourceCount":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"completedSourceCount":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"policyObservationComplete":{"type":"boolean"},"inputComplete":{"type":"boolean"},"changed":{"type":"boolean"},"candidateSha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"candidateByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"}},"oneOf":[{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"source":true,"path":true,"scope":true,"linkedExpectationsComplete":true,"byteLength":true,"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"type":{"const":"source"},"operationScope":true},"required":["source"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"source":true,"reference":true,"parent":true,"name":true,"ordinal":true,"kind":true,"byteLength":true,"sha256":true,"closed":true,"rawByteLength":true,"sourceByteOffset":true,"nfcAvailable":true,"path":true,"scope":true,"linkedExpectationsComplete":true,"record":true,"nfcByteLength":true,"type":{"const":"value"},"operationScope":true},"required":["source","reference","parent","name","ordinal","kind","byteLength","sha256","closed","rawByteLength","sourceByteOffset","nfcAvailable"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"source":true,"value":true,"severity":true,"phase":true,"ruleId":true,"messageId":true,"arguments":true,"line":true,"column":true,"endLine":true,"endColumn":true,"path":true,"scope":true,"linkedExpectationsComplete":true,"record":true,"type":{"const":"finding"},"operationScope":true},"required":["source","value","severity","phase","ruleId","messageId","arguments","line","column","endLine","endColumn"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"source":true,"parserComplete":true,"rulesComplete":true,"semanticRulesApplicable":true,"presentationSelected":true,"presentationChecked":true,"diagnosticsComplete":true,"domainAdmission":true,"qualityPassed":true,"expectedMatched":true,"contractSatisfied":true,"findingCount":true,"diagnosticSha256":true,"sourceSha256":true,"managedPeakBytes":true,"spillTransitionCount":true,"scratchPeakBytes":true,"path":true,"scope":true,"linkedExpectationsComplete":true,"recordCount":true,"linkage":true,"type":{"const":"terminal"},"formatEligible":true,"normalizeEligible":true,"operationScope":true},"required":["source","parserComplete","rulesComplete","semanticRulesApplicable","presentationSelected","presentationChecked","diagnosticsComplete","domainAdmission","qualityPassed","expectedMatched","contractSatisfied","findingCount","diagnosticSha256","sourceSha256","managedPeakBytes","spillTransitionCount","scratchPeakBytes","formatEligible","normalizeEligible"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"resources":true,"coreSourceInputsSha256":true,"qualification":true,"type":{"const":"execution"},"configurationOrigin":true,"defaultPolicySha256":true,"policyResolverInputsSha256":true,"policyInputsSha256":true,"configurationBytesSha256":true,"configurationByteLength":true,"operationScope":true,"root":true},"required":["resources","coreSourceInputsSha256","configurationOrigin","defaultPolicySha256","policyResolverInputsSha256","policyInputsSha256"],"allOf":[{"if":{"properties":{"configurationOrigin":{"properties":{"kind":{"enum":["repository-file","git-blob"]}},"type":"object"}}},"then":{"required":["configurationBytesSha256","configurationByteLength"],"properties":{"configurationBytesSha256":true,"configurationByteLength":true}},"else":{"not":{"anyOf":[{"required":["configurationBytesSha256"]},{"required":["configurationByteLength"]}],"properties":{"configurationBytesSha256":true,"configurationByteLength":true}}}}]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"inventoryComplete":{"const":true},"qualification":true,"linkedExpectationsComplete":{"const":true},"sourceObservationsComplete":{"const":true},"diagnosticsComplete":{"const":true},"domainComplete":true,"inventoryMemberCount":true,"qualityPassed":true,"contractSatisfied":true,"type":{"const":"execution-terminal"},"operationScope":true,"root":true},"required":["inventoryComplete","linkedExpectationsComplete","sourceObservationsComplete","diagnosticsComplete","domainComplete","inventoryMemberCount","qualityPassed","contractSatisfied"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"code":true,"message":true,"truncated":true,"type":{"const":"failure"},"operationScope":true},"required":["code","message","truncated"]},{"type":"object","additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"type":{"const":"write-preflight"},"operation":true,"selectedPathCount":true,"changedPathCount":true,"preflightComplete":{"const":true},"operationScope":true},"required":["schemaVersion","requestId","type","operation","selectedPathCount","changedPathCount","preflightComplete"]},{"type":"object","additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"type":{"const":"written"},"operation":true,"path":true,"byteLength":true,"sha256":true,"operationScope":true},"required":["schemaVersion","requestId","type","operation","path","byteLength","sha256"]},{"type":"object","additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"type":{"const":"write-terminal"},"operation":true,"selectedPathCount":true,"changedPathCount":true,"complete":{"const":true},"writesComplete":{"const":true},"preflightComplete":{"const":true},"sourceObservationsComplete":{"const":true},"writtenPathCount":true,"qualityPassed":true,"findingCount":true,"operationScope":true},"required":["schemaVersion","requestId","type","operation","selectedPathCount","changedPathCount","writtenPathCount","complete","writesComplete","preflightComplete","sourceObservationsComplete","qualityPassed","findingCount"]},{"type":"object","additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"type":{"const":"write-failure"},"operation":true,"complete":{"const":false},"preflightComplete":true,"uncertainPath":true,"message":true,"writtenPathCount":true,"operationScope":true},"if":{"properties":{"message":{"$ref":"#/$defs/rewriteQualityRefusal"}}},"then":{"properties":{"preflightComplete":{"const":false},"writtenPathCount":{"const":"0"},"uncertainPath":{"type":"null"}}},"required":["schemaVersion","requestId","type","operation","complete","preflightComplete","writtenPathCount","uncertainPath","message"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"source":true,"path":true,"scope":true,"linkedExpectationsComplete":true,"record":true,"containerValue":true,"value":true,"priorValue":true,"line":true,"column":true,"endLine":true,"endColumn":true,"priorLine":true,"priorColumn":true,"priorEndLine":true,"priorEndColumn":true,"normalizedSha256":true,"normalizedByteLength":true,"type":{"const":"nfc-key-collision-risk"},"operationScope":true},"required":["schemaVersion","requestId","source","containerValue","value","priorValue","line","column","endLine","endColumn","priorLine","priorColumn","priorEndLine","priorEndColumn","normalizedSha256","normalizedByteLength"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"operation":true,"path":true,"sourceSha256":true,"sourceByteLength":true,"sourceByteOffset":true,"rawByteLength":true,"pointer":true,"valueKind":true,"normalizedSha256":true,"normalizedByteLength":true,"coreSourceInputsSha256":true,"icuVersion":true,"unicodeVersion":true,"type":{"const":"normalization-preview-change"},"decodedByteLength":true,"decodedSha256":true,"operationScope":true},"required":["schemaVersion","requestId","operation","path","sourceSha256","sourceByteLength","sourceByteOffset","rawByteLength","pointer","valueKind","normalizedSha256","normalizedByteLength","coreSourceInputsSha256","icuVersion","unicodeVersion","decodedByteLength","decodedSha256"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"operation":true,"complete":true,"preflightComplete":true,"sourceObservationsComplete":true,"selectedPathCount":true,"changedPathCount":true,"qualityPassed":true,"findingCount":true,"message":true,"type":{"const":"normalization-preview-terminal"},"coreSourceInputsSha256":true,"icuVersion":true,"unicodeVersion":true,"operationScope":true},"required":["schemaVersion","requestId","operation","complete","preflightComplete","sourceObservationsComplete","coreSourceInputsSha256","icuVersion","unicodeVersion"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"operationScope":{"type":"object","additionalProperties":false,"required":["kind","policy","completeRepositoryCheck"],"properties":{"kind":{"enum":["selected-files","stdin"]},"policy":{"const":"repository"},"completeRepositoryCheck":{"const":false}},"oneOf":[{"properties":{"kind":{"const":"repository"},"policy":{"const":"repository"}}},{"properties":{"kind":{"const":"selected-files"},"policy":{"const":"repository"},"completeRepositoryCheck":{"const":false}}},{"properties":{"kind":{"const":"stdin"},"policy":{"enum":["repository","explicit-contract"]},"completeRepositoryCheck":{"const":false}}},{"properties":{"kind":{"const":"immutable-git-json"},"policy":{"const":"trusted-git"},"completeRepositoryCheck":{"const":false}}}]},"root":true,"inputKind":true,"selectedSourceCount":true,"resources":true,"configurationOrigin":true,"defaultPolicySha256":true,"policyResolverInputsSha256":true,"configurationBytesSha256":true,"configurationByteLength":true,"policyInputsSha256":true,"coreSourceInputsSha256":true,"type":{"const":"selection"}},"required":["schemaVersion","requestId","type","operationScope","root","inputKind","selectedSourceCount","resources","configurationOrigin","defaultPolicySha256","policyResolverInputsSha256","policyInputsSha256","coreSourceInputsSha256"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"operationScope":{"type":"object","additionalProperties":false,"required":["kind","policy","completeRepositoryCheck"],"properties":{"kind":{"enum":["selected-files","stdin"]},"policy":{"const":"repository"},"completeRepositoryCheck":{"const":false}},"oneOf":[{"properties":{"kind":{"const":"repository"},"policy":{"const":"repository"}}},{"properties":{"kind":{"const":"selected-files"},"policy":{"const":"repository"},"completeRepositoryCheck":{"const":false}}},{"properties":{"kind":{"const":"stdin"},"policy":{"enum":["repository","explicit-contract"]},"completeRepositoryCheck":{"const":false}}},{"properties":{"kind":{"const":"immutable-git-json"},"policy":{"const":"trusted-git"},"completeRepositoryCheck":{"const":false}}}]},"root":true,"inputKind":true,"selectedSourceCount":true,"completedSourceCount":true,"complete":{"const":true},"diagnosticsComplete":true,"qualityPassed":true,"contractSatisfied":true,"policyObservationComplete":{"const":true},"sourceObservationsComplete":true,"inputComplete":true,"findingCount":true,"coreSourceInputsSha256":true,"type":{"const":"selection-terminal"}},"required":["schemaVersion","requestId","type","operationScope","inputKind","selectedSourceCount","completedSourceCount","complete","diagnosticsComplete","qualityPassed","contractSatisfied","policyObservationComplete"],"allOf":[{"if":{"properties":{"inputKind":{"const":"physical"}}},"then":{"required":["sourceObservationsComplete"],"properties":{"sourceObservationsComplete":{"const":true}},"not":{"required":["inputComplete"],"properties":{"inputComplete":true}}},"else":{"required":["inputComplete"],"properties":{"inputComplete":{"const":true}},"not":{"required":["sourceObservationsComplete"],"properties":{"sourceObservationsComplete":true}}}}]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"operationScope":true,"operation":{"const":"format"},"path":true,"changed":true,"sourceSha256":true,"sourceByteLength":true,"candidateSha256":true,"candidateByteLength":true,"coreSourceInputsSha256":true,"icuVersion":true,"unicodeVersion":true,"type":{"const":"format-preview-change"}},"required":["schemaVersion","requestId","type","operation","path","changed","sourceSha256","sourceByteLength","candidateSha256","candidateByteLength","coreSourceInputsSha256","icuVersion","unicodeVersion"]},{"additionalProperties":false,"properties":{"schemaVersion":true,"requestId":true,"operation":{"const":"format"},"complete":{"const":true},"preflightComplete":true,"sourceObservationsComplete":true,"selectedPathCount":true,"changedPathCount":true,"qualityPassed":true,"findingCount":true,"message":true,"type":{"const":"format-preview-terminal"},"coreSourceInputsSha256":true,"icuVersion":true,"unicodeVersion":true,"operationScope":true},"required":["schemaVersion","requestId","operation","complete","preflightComplete","sourceObservationsComplete","coreSourceInputsSha256","icuVersion","unicodeVersion"],"allOf":[{"if":{"properties":{"preflightComplete":{"const":true}}},"then":{"required":["selectedPathCount","changedPathCount","qualityPassed","findingCount"]},"else":{"required":["message"]}}]}],"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://github.com/Hadden-Industries/json-quality/schema/event/v5","$defs":{"rewriteQualityRefusal":{"description":"Native refusal identities carried by the existing v5 write-failure message before any replacement.","enum":["rewrite-unsafe-source","rewrite-candidate-not-accepted","rewrite-peer-preflight-failed"]},"valueReference":{"type":"object","additionalProperties":false,"required":["kind","referenceId"],"properties":{"kind":{"const":"value"},"referenceId":{"type":"string","pattern":"^[a-f0-9-]{36}:value:[1-9][0-9]*$"},"byteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"sha256":{"anyOf":[{"type":"string","pattern":"^[a-f0-9]{64}$"},{"type":"null"}]},"ordinal":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"record":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"rawByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"sourceByteOffset":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"nfcByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"closed":{"type":"boolean"},"nfcAvailable":{"type":"boolean"},"valueKind":{"enum":["string","key","number","true","false","null","array","object"]}}},"sourceReference":{"type":"object","additionalProperties":false,"required":["kind","referenceId"],"properties":{"kind":{"const":"source"},"referenceId":{"type":"string","pattern":"^[a-f0-9-]{36}:source:[1-9][0-9]*$"},"byteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"}}}},"discriminator":{"propertyName":"type"}};
const func1 = Object.prototype.hasOwnProperty;
const func2 = require("ajv/dist/runtime/ucs2length").default;
const pattern3 = new RegExp("^[a-f0-9]{40}$", "u");
const pattern12 = new RegExp("^[a-f0-9]{64}$", "u");
const pattern11 = new RegExp("^(?:/(?:[^~/]|~[01])*)*$", "u");
const schema20 = {"type":"object","additionalProperties":false,"required":["kind","referenceId"],"properties":{"kind":{"const":"source"},"referenceId":{"type":"string","pattern":"^[a-f0-9-]{36}:source:[1-9][0-9]*$"},"byteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"}}};
const pattern6 = new RegExp("^[a-f0-9-]{36}:source:[1-9][0-9]*$", "u");
const schema25 = {"description":"Canonical unsigned decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.","type":"string","pattern":"^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$","maxLength":20};
const pattern18 = new RegExp("^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$", "u");

function validate75(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate75.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(typeof data === "string"){
if(func2(data) > 20){
validate75.errors = [{instancePath,schemaPath:"#/maxLength",keyword:"maxLength",params:{limit: 20},message:"must NOT have more than 20 characters"}];
return false;
}
else {
if(!pattern18.test(data)){
validate75.errors = [{instancePath,schemaPath:"#/pattern",keyword:"pattern",params:{pattern: "^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"},message:"must match pattern \""+"^(?:0|[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"+"\""}];
return false;
}
}
}
else {
validate75.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
validate75.errors = vErrors;
return errors === 0;
}
validate75.evaluated = {"dynamicProps":false,"dynamicItems":false};


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
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.kind === undefined) && (missing0 = "kind")) || ((data.referenceId === undefined) && (missing0 = "referenceId"))){
validate53.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "kind") || (key0 === "referenceId")) || (key0 === "byteLength")) || (key0 === "sha256"))){
validate53.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("source" !== data.kind){
validate53.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "source"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.referenceId !== undefined){
let data1 = data.referenceId;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data1 === "string"){
if(!pattern6.test(data1)){
validate53.errors = [{instancePath:instancePath+"/referenceId",schemaPath:"#/properties/referenceId/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9-]{36}:source:[1-9][0-9]*$"},message:"must match pattern \""+"^[a-f0-9-]{36}:source:[1-9][0-9]*$"+"\""}];
return false;
}
}
else {
validate53.errors = [{instancePath:instancePath+"/referenceId",schemaPath:"#/properties/referenceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.byteLength !== undefined){
const _errs5 = errors;
if(!(validate75(data.byteLength, {instancePath:instancePath+"/byteLength",parentData:data,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sha256 !== undefined){
let data3 = data.sha256;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data3 === "string"){
if(!pattern12.test(data3)){
validate53.errors = [{instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate53.errors = [{instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
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
else {
validate53.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate53.errors = vErrors;
return errors === 0;
}
validate53.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema30 = {"type":"object","additionalProperties":false,"required":["kind","referenceId"],"properties":{"kind":{"const":"value"},"referenceId":{"type":"string","pattern":"^[a-f0-9-]{36}:value:[1-9][0-9]*$"},"byteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"sha256":{"anyOf":[{"type":"string","pattern":"^[a-f0-9]{64}$"},{"type":"null"}]},"ordinal":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"record":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/positiveIntegerText"},"rawByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"sourceByteOffset":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"nfcByteLength":{"$ref":"https://github.com/Hadden-Industries/json-quality/schema/configuration/v4#/$defs/unsignedIntegerText"},"closed":{"type":"boolean"},"nfcAvailable":{"type":"boolean"},"valueKind":{"enum":["string","key","number","true","false","null","array","object"]}}};
const pattern27 = new RegExp("^[a-f0-9-]{36}:value:[1-9][0-9]*$", "u");
const schema24 = {"description":"Canonical positive decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.","type":"string","pattern":"^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$","maxLength":20};
const pattern13 = new RegExp("^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$", "u");

function validate81(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate81.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(typeof data === "string"){
if(func2(data) > 20){
validate81.errors = [{instancePath,schemaPath:"#/maxLength",keyword:"maxLength",params:{limit: 20},message:"must NOT have more than 20 characters"}];
return false;
}
else {
if(!pattern13.test(data)){
validate81.errors = [{instancePath,schemaPath:"#/pattern",keyword:"pattern",params:{pattern: "^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"},message:"must match pattern \""+"^(?:[1-9][0-9]{0,18}|1[0-7][0-9]{18}|18[0-3][0-9]{17}|184[0-3][0-9]{16}|1844[0-5][0-9]{15}|18446[0-6][0-9]{14}|184467[0-3][0-9]{13}|1844674[0-3][0-9]{12}|184467440[0-6][0-9]{10}|1844674407[0-2][0-9]{9}|18446744073[0-6][0-9]{8}|1844674407370[0-8][0-9]{6}|18446744073709[0-4][0-9]{5}|184467440737095[0-4][0-9]{4}|18446744073709550[0-9]{3}|18446744073709551[0-5][0-9]{2}|1844674407370955160[0-9]{1}|1844674407370955161[0-4]|18446744073709551615)$"+"\""}];
return false;
}
}
}
else {
validate81.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
validate81.errors = vErrors;
return errors === 0;
}
validate81.evaluated = {"dynamicProps":false,"dynamicItems":false};


function validate78(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate78.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.kind === undefined) && (missing0 = "kind")) || ((data.referenceId === undefined) && (missing0 = "referenceId"))){
validate78.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func1.call(schema30.properties, key0))){
validate78.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("value" !== data.kind){
validate78.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "value"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.referenceId !== undefined){
let data1 = data.referenceId;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data1 === "string"){
if(!pattern27.test(data1)){
validate78.errors = [{instancePath:instancePath+"/referenceId",schemaPath:"#/properties/referenceId/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9-]{36}:value:[1-9][0-9]*$"},message:"must match pattern \""+"^[a-f0-9-]{36}:value:[1-9][0-9]*$"+"\""}];
return false;
}
}
else {
validate78.errors = [{instancePath:instancePath+"/referenceId",schemaPath:"#/properties/referenceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.byteLength !== undefined){
const _errs5 = errors;
if(!(validate75(data.byteLength, {instancePath:instancePath+"/byteLength",parentData:data,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sha256 !== undefined){
let data3 = data.sha256;
const _errs6 = errors;
const _errs7 = errors;
let valid1 = false;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data3 === "string"){
if(!pattern12.test(data3)){
const err0 = {instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/anyOf/0/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
else {
const err1 = {instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
var _valid0 = _errs8 === errors;
valid1 = valid1 || _valid0;
const _errs10 = errors;
if(data3 !== null){
const err2 = {instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
var _valid0 = _errs10 === errors;
valid1 = valid1 || _valid0;
if(!valid1){
const err3 = {instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
validate78.errors = vErrors;
return false;
}
else {
errors = _errs7;
if(vErrors !== null){
if(_errs7){
vErrors.length = _errs7;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.ordinal !== undefined){
const _errs12 = errors;
if(!(validate75(data.ordinal, {instancePath:instancePath+"/ordinal",parentData:data,parentDataProperty:"ordinal",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.record !== undefined){
const _errs13 = errors;
if(!(validate81(data.record, {instancePath:instancePath+"/record",parentData:data,parentDataProperty:"record",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rawByteLength !== undefined){
const _errs14 = errors;
if(!(validate75(data.rawByteLength, {instancePath:instancePath+"/rawByteLength",parentData:data,parentDataProperty:"rawByteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceByteOffset !== undefined){
const _errs15 = errors;
if(!(validate75(data.sourceByteOffset, {instancePath:instancePath+"/sourceByteOffset",parentData:data,parentDataProperty:"sourceByteOffset",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.nfcByteLength !== undefined){
const _errs16 = errors;
if(!(validate75(data.nfcByteLength, {instancePath:instancePath+"/nfcByteLength",parentData:data,parentDataProperty:"nfcByteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.closed !== undefined){
const _errs17 = errors;
if(typeof data.closed !== "boolean"){
validate78.errors = [{instancePath:instancePath+"/closed",schemaPath:"#/properties/closed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.nfcAvailable !== undefined){
const _errs19 = errors;
if(typeof data.nfcAvailable !== "boolean"){
validate78.errors = [{instancePath:instancePath+"/nfcAvailable",schemaPath:"#/properties/nfcAvailable/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.valueKind !== undefined){
let data11 = data.valueKind;
const _errs21 = errors;
if(!((((((((data11 === "string") || (data11 === "key")) || (data11 === "number")) || (data11 === "true")) || (data11 === "false")) || (data11 === "null")) || (data11 === "array")) || (data11 === "object"))){
validate78.errors = [{instancePath:instancePath+"/valueKind",schemaPath:"#/properties/valueKind/enum",keyword:"enum",params:{allowedValues: schema30.properties.valueKind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs21 === errors;
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
}
}
else {
validate78.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate78.errors = vErrors;
return errors === 0;
}
validate78.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema32 = {"description":"Native refusal identities carried by the existing v5 write-failure message before any replacement.","enum":["rewrite-unsafe-source","rewrite-candidate-not-accepted","rewrite-peer-preflight-failed"]};

function validate145(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate145.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(!(((data === "rewrite-unsafe-source") || (data === "rewrite-candidate-not-accepted")) || (data === "rewrite-peer-preflight-failed"))){
validate145.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema32.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate145.errors = vErrors;
return errors === 0;
}
validate145.evaluated = {"dynamicProps":false,"dynamicItems":false};


function validate52(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://github.com/Hadden-Industries/json-quality/schema/event/v5" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate52.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.schemaVersion === undefined) && (missing0 = "schemaVersion")) || ((data.requestId === undefined) && (missing0 = "requestId"))) || ((data.type === undefined) && (missing0 = "type"))){
validate52.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs2 = errors;
for(const key0 in data){
if(!(func1.call(schema19.properties, key0))){
validate52.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs2 === errors){
if(data.qualification !== undefined){
let data0 = data.qualification;
const _errs3 = errors;
if(errors === _errs3){
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
let missing1;
if((((data0.trustedCommitId === undefined) && (missing1 = "trustedCommitId")) || ((data0.candidateCommitId === undefined) && (missing1 = "candidateCommitId"))) || ((data0.scope === undefined) && (missing1 = "scope"))){
validate52.errors = [{instancePath:instancePath+"/qualification",schemaPath:"#/properties/qualification/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs5 = errors;
for(const key1 in data0){
if(!((((key1 === "trustedCommitId") || (key1 === "candidateCommitId")) || (key1 === "trustedPolicyBlobId")) || (key1 === "scope"))){
validate52.errors = [{instancePath:instancePath+"/qualification",schemaPath:"#/properties/qualification/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs5 === errors){
if(data0.trustedCommitId !== undefined){
let data1 = data0.trustedCommitId;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(!pattern3.test(data1)){
validate52.errors = [{instancePath:instancePath+"/qualification/trustedCommitId",schemaPath:"#/properties/qualification/properties/trustedCommitId/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{40}$"},message:"must match pattern \""+"^[a-f0-9]{40}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/qualification/trustedCommitId",schemaPath:"#/properties/qualification/properties/trustedCommitId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid1 = _errs6 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data0.candidateCommitId !== undefined){
let data2 = data0.candidateCommitId;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 === "string"){
if(!pattern3.test(data2)){
validate52.errors = [{instancePath:instancePath+"/qualification/candidateCommitId",schemaPath:"#/properties/qualification/properties/candidateCommitId/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{40}$"},message:"must match pattern \""+"^[a-f0-9]{40}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/qualification/candidateCommitId",schemaPath:"#/properties/qualification/properties/candidateCommitId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid1 = _errs8 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data0.trustedPolicyBlobId !== undefined){
let data3 = data0.trustedPolicyBlobId;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(!pattern3.test(data3)){
validate52.errors = [{instancePath:instancePath+"/qualification/trustedPolicyBlobId",schemaPath:"#/properties/qualification/properties/trustedPolicyBlobId/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{40}$"},message:"must match pattern \""+"^[a-f0-9]{40}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/qualification/trustedPolicyBlobId",schemaPath:"#/properties/qualification/properties/trustedPolicyBlobId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid1 = _errs10 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data0.scope !== undefined){
const _errs12 = errors;
if("immutable-git-json" !== data0.scope){
validate52.errors = [{instancePath:instancePath+"/qualification/scope",schemaPath:"#/properties/qualification/properties/scope/const",keyword:"const",params:{allowedValue: "immutable-git-json"},message:"must be equal to constant"}];
return false;
}
var valid1 = _errs12 === errors;
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
validate52.errors = [{instancePath:instancePath+"/qualification",schemaPath:"#/properties/qualification/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schemaVersion !== undefined){
const _errs13 = errors;
if(5 !== data.schemaVersion){
validate52.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 5},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.requestId !== undefined){
let data6 = data.requestId;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data6 === "string"){
if(func2(data6) < 1){
validate52.errors = [{instancePath:instancePath+"/requestId",schemaPath:"#/properties/requestId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/requestId",schemaPath:"#/properties/requestId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.type !== undefined){
let data7 = data.type;
const _errs16 = errors;
if(!((((((((((((((((((data7 === "source") || (data7 === "value")) || (data7 === "finding")) || (data7 === "terminal")) || (data7 === "execution")) || (data7 === "execution-terminal")) || (data7 === "failure")) || (data7 === "write-preflight")) || (data7 === "written")) || (data7 === "write-terminal")) || (data7 === "write-failure")) || (data7 === "nfc-key-collision-risk")) || (data7 === "normalization-preview-change")) || (data7 === "normalization-preview-terminal")) || (data7 === "selection")) || (data7 === "selection-terminal")) || (data7 === "format-preview-change")) || (data7 === "format-preview-terminal"))){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/enum",keyword:"enum",params:{allowedValues: schema19.properties.type.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.path !== undefined){
let data8 = data.path;
const _errs17 = errors;
if(errors === _errs17){
if(typeof data8 === "string"){
if(func2(data8) < 1){
validate52.errors = [{instancePath:instancePath+"/path",schemaPath:"#/properties/path/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/path",schemaPath:"#/properties/path/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.source !== undefined){
const _errs19 = errors;
if(!(validate53(data.source, {instancePath:instancePath+"/source",parentData:data,parentDataProperty:"source",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate53.errors : vErrors.concat(validate53.errors);
errors = vErrors.length;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reference !== undefined){
const _errs20 = errors;
if(!(validate78(data.reference, {instancePath:instancePath+"/reference",parentData:data,parentDataProperty:"reference",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.value !== undefined){
let data11 = data.value;
const _errs21 = errors;
const _errs22 = errors;
let valid2 = false;
const _errs23 = errors;
if(!(validate78(data11, {instancePath:instancePath+"/value",parentData:data,parentDataProperty:"value",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var _valid0 = _errs23 === errors;
valid2 = valid2 || _valid0;
const _errs24 = errors;
if(data11 !== null){
const err0 = {instancePath:instancePath+"/value",schemaPath:"#/properties/value/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
var _valid0 = _errs24 === errors;
valid2 = valid2 || _valid0;
if(!valid2){
const err1 = {instancePath:instancePath+"/value",schemaPath:"#/properties/value/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
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
else {
errors = _errs22;
if(vErrors !== null){
if(_errs22){
vErrors.length = _errs22;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.parent !== undefined){
let data12 = data.parent;
const _errs26 = errors;
const _errs27 = errors;
let valid3 = false;
const _errs28 = errors;
if(!(validate78(data12, {instancePath:instancePath+"/parent",parentData:data,parentDataProperty:"parent",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var _valid1 = _errs28 === errors;
valid3 = valid3 || _valid1;
const _errs29 = errors;
if(data12 !== null){
const err2 = {instancePath:instancePath+"/parent",schemaPath:"#/properties/parent/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
var _valid1 = _errs29 === errors;
valid3 = valid3 || _valid1;
if(!valid3){
const err3 = {instancePath:instancePath+"/parent",schemaPath:"#/properties/parent/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs27;
if(vErrors !== null){
if(_errs27){
vErrors.length = _errs27;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs26 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.name !== undefined){
let data13 = data.name;
const _errs31 = errors;
const _errs32 = errors;
let valid4 = false;
const _errs33 = errors;
if(!(validate78(data13, {instancePath:instancePath+"/name",parentData:data,parentDataProperty:"name",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var _valid2 = _errs33 === errors;
valid4 = valid4 || _valid2;
const _errs34 = errors;
if(data13 !== null){
const err4 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
var _valid2 = _errs34 === errors;
valid4 = valid4 || _valid2;
if(!valid4){
const err5 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs32;
if(vErrors !== null){
if(_errs32){
vErrors.length = _errs32;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs31 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.scope !== undefined){
let data14 = data.scope;
const _errs36 = errors;
if(!((data14 === "source") || (data14 === "candidate"))){
validate52.errors = [{instancePath:instancePath+"/scope",schemaPath:"#/properties/scope/enum",keyword:"enum",params:{allowedValues: schema19.properties.scope.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs36 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedExpectationsComplete !== undefined){
const _errs37 = errors;
if(typeof data.linkedExpectationsComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/linkedExpectationsComplete",schemaPath:"#/properties/linkedExpectationsComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs37 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.byteLength !== undefined){
const _errs39 = errors;
if(!(validate75(data.byteLength, {instancePath:instancePath+"/byteLength",parentData:data,parentDataProperty:"byteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs39 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sha256 !== undefined){
let data17 = data.sha256;
const _errs40 = errors;
const _errs41 = errors;
let valid5 = false;
const _errs42 = errors;
if(errors === _errs42){
if(typeof data17 === "string"){
if(!pattern12.test(data17)){
const err6 = {instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/anyOf/0/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
var _valid3 = _errs42 === errors;
valid5 = valid5 || _valid3;
const _errs44 = errors;
if(data17 !== null){
const err8 = {instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid3 = _errs44 === errors;
valid5 = valid5 || _valid3;
if(!valid5){
const err9 = {instancePath:instancePath+"/sha256",schemaPath:"#/properties/sha256/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs41;
if(vErrors !== null){
if(_errs41){
vErrors.length = _errs41;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs40 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.ordinal !== undefined){
const _errs46 = errors;
if(!(validate75(data.ordinal, {instancePath:instancePath+"/ordinal",parentData:data,parentDataProperty:"ordinal",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs46 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.record !== undefined){
const _errs47 = errors;
if(!(validate81(data.record, {instancePath:instancePath+"/record",parentData:data,parentDataProperty:"record",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs47 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rawByteLength !== undefined){
const _errs48 = errors;
if(!(validate75(data.rawByteLength, {instancePath:instancePath+"/rawByteLength",parentData:data,parentDataProperty:"rawByteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs48 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceByteOffset !== undefined){
const _errs49 = errors;
if(!(validate75(data.sourceByteOffset, {instancePath:instancePath+"/sourceByteOffset",parentData:data,parentDataProperty:"sourceByteOffset",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs49 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.nfcByteLength !== undefined){
const _errs50 = errors;
if(!(validate75(data.nfcByteLength, {instancePath:instancePath+"/nfcByteLength",parentData:data,parentDataProperty:"nfcByteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs50 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.closed !== undefined){
const _errs51 = errors;
if(typeof data.closed !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/closed",schemaPath:"#/properties/closed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs51 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.nfcAvailable !== undefined){
const _errs53 = errors;
if(typeof data.nfcAvailable !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/nfcAvailable",schemaPath:"#/properties/nfcAvailable/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs53 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.valueKind !== undefined){
let data25 = data.valueKind;
const _errs55 = errors;
if(!((data25 === "key") || (data25 === "string"))){
validate52.errors = [{instancePath:instancePath+"/valueKind",schemaPath:"#/properties/valueKind/enum",keyword:"enum",params:{allowedValues: schema19.properties.valueKind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs55 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.kind !== undefined){
let data26 = data.kind;
const _errs56 = errors;
if(!((((((((data26 === "string") || (data26 === "key")) || (data26 === "number")) || (data26 === "true")) || (data26 === "false")) || (data26 === "null")) || (data26 === "array")) || (data26 === "object"))){
validate52.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/enum",keyword:"enum",params:{allowedValues: schema19.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs56 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.severity !== undefined){
const _errs57 = errors;
if("error" !== data.severity){
validate52.errors = [{instancePath:instancePath+"/severity",schemaPath:"#/properties/severity/const",keyword:"const",params:{allowedValue: "error"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs57 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.phase !== undefined){
let data28 = data.phase;
const _errs58 = errors;
if(!((((((data28 === "bytes") || (data28 === "syntax")) || (data28 === "lint")) || (data28 === "framing")) || (data28 === "expectation")) || (data28 === "presentation"))){
validate52.errors = [{instancePath:instancePath+"/phase",schemaPath:"#/properties/phase/enum",keyword:"enum",params:{allowedValues: schema19.properties.phase.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs58 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.ruleId !== undefined){
let data29 = data.ruleId;
const _errs59 = errors;
if((typeof data29 !== "string") && (data29 !== null)){
validate52.errors = [{instancePath:instancePath+"/ruleId",schemaPath:"#/properties/ruleId/type",keyword:"type",params:{type: schema19.properties.ruleId.type},message:"must be string,null"}];
return false;
}
var valid0 = _errs59 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.messageId !== undefined){
let data30 = data.messageId;
const _errs61 = errors;
if(errors === _errs61){
if(typeof data30 === "string"){
if(func2(data30) < 1){
validate52.errors = [{instancePath:instancePath+"/messageId",schemaPath:"#/properties/messageId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/messageId",schemaPath:"#/properties/messageId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs61 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.arguments !== undefined){
let data31 = data.arguments;
const _errs63 = errors;
if(!(data31 && typeof data31 == "object" && !Array.isArray(data31))){
validate52.errors = [{instancePath:instancePath+"/arguments",schemaPath:"#/properties/arguments/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
var valid0 = _errs63 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.line !== undefined){
const _errs65 = errors;
if(!(validate81(data.line, {instancePath:instancePath+"/line",parentData:data,parentDataProperty:"line",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs65 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.column !== undefined){
const _errs66 = errors;
if(!(validate81(data.column, {instancePath:instancePath+"/column",parentData:data,parentDataProperty:"column",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs66 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endLine !== undefined){
const _errs67 = errors;
if(!(validate81(data.endLine, {instancePath:instancePath+"/endLine",parentData:data,parentDataProperty:"endLine",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs67 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endColumn !== undefined){
const _errs68 = errors;
if(!(validate81(data.endColumn, {instancePath:instancePath+"/endColumn",parentData:data,parentDataProperty:"endColumn",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs68 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.parserComplete !== undefined){
const _errs69 = errors;
if(typeof data.parserComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/parserComplete",schemaPath:"#/properties/parserComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs69 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rulesComplete !== undefined){
const _errs71 = errors;
if(typeof data.rulesComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/rulesComplete",schemaPath:"#/properties/rulesComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs71 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.semanticRulesApplicable !== undefined){
const _errs73 = errors;
if(typeof data.semanticRulesApplicable !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/semanticRulesApplicable",schemaPath:"#/properties/semanticRulesApplicable/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs73 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.presentationSelected !== undefined){
const _errs75 = errors;
if(typeof data.presentationSelected !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/presentationSelected",schemaPath:"#/properties/presentationSelected/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs75 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.presentationChecked !== undefined){
const _errs77 = errors;
if(typeof data.presentationChecked !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/presentationChecked",schemaPath:"#/properties/presentationChecked/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs77 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.diagnosticsComplete !== undefined){
const _errs79 = errors;
if(typeof data.diagnosticsComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/diagnosticsComplete",schemaPath:"#/properties/diagnosticsComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs79 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.qualityPassed !== undefined){
const _errs81 = errors;
if(typeof data.qualityPassed !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/qualityPassed",schemaPath:"#/properties/qualityPassed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs81 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.contractSatisfied !== undefined){
const _errs83 = errors;
if(typeof data.contractSatisfied !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/contractSatisfied",schemaPath:"#/properties/contractSatisfied/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs83 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.inventoryComplete !== undefined){
const _errs85 = errors;
if(typeof data.inventoryComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/inventoryComplete",schemaPath:"#/properties/inventoryComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs85 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceObservationsComplete !== undefined){
const _errs87 = errors;
if(typeof data.sourceObservationsComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/sourceObservationsComplete",schemaPath:"#/properties/sourceObservationsComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs87 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expectedMatched !== undefined){
let data46 = data.expectedMatched;
const _errs89 = errors;
if((typeof data46 !== "boolean") && (data46 !== null)){
validate52.errors = [{instancePath:instancePath+"/expectedMatched",schemaPath:"#/properties/expectedMatched/type",keyword:"type",params:{type: schema19.properties.expectedMatched.type},message:"must be boolean,null"}];
return false;
}
var valid0 = _errs89 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.domainAdmission !== undefined){
const _errs91 = errors;
if("unassessed" !== data.domainAdmission){
validate52.errors = [{instancePath:instancePath+"/domainAdmission",schemaPath:"#/properties/domainAdmission/const",keyword:"const",params:{allowedValue: "unassessed"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs91 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.domainComplete !== undefined){
const _errs92 = errors;
if(false !== data.domainComplete){
validate52.errors = [{instancePath:instancePath+"/domainComplete",schemaPath:"#/properties/domainComplete/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs92 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.findingCount !== undefined){
const _errs93 = errors;
if(!(validate75(data.findingCount, {instancePath:instancePath+"/findingCount",parentData:data,parentDataProperty:"findingCount",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs93 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.managedPeakBytes !== undefined){
const _errs94 = errors;
if(!(validate75(data.managedPeakBytes, {instancePath:instancePath+"/managedPeakBytes",parentData:data,parentDataProperty:"managedPeakBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs94 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.spillTransitionCount !== undefined){
const _errs95 = errors;
if(!(validate75(data.spillTransitionCount, {instancePath:instancePath+"/spillTransitionCount",parentData:data,parentDataProperty:"spillTransitionCount",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs95 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.scratchPeakBytes !== undefined){
const _errs96 = errors;
if(!(validate75(data.scratchPeakBytes, {instancePath:instancePath+"/scratchPeakBytes",parentData:data,parentDataProperty:"scratchPeakBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs96 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.inventoryMemberCount !== undefined){
const _errs97 = errors;
if(!(validate75(data.inventoryMemberCount, {instancePath:instancePath+"/inventoryMemberCount",parentData:data,parentDataProperty:"inventoryMemberCount",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs97 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.recordCount !== undefined){
let data54 = data.recordCount;
const _errs98 = errors;
const _errs99 = errors;
let valid6 = false;
const _errs100 = errors;
if(!(validate75(data54, {instancePath:instancePath+"/recordCount",parentData:data,parentDataProperty:"recordCount",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var _valid4 = _errs100 === errors;
valid6 = valid6 || _valid4;
const _errs101 = errors;
if(data54 !== null){
const err10 = {instancePath:instancePath+"/recordCount",schemaPath:"#/properties/recordCount/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var _valid4 = _errs101 === errors;
valid6 = valid6 || _valid4;
if(!valid6){
const err11 = {instancePath:instancePath+"/recordCount",schemaPath:"#/properties/recordCount/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs99;
if(vErrors !== null){
if(_errs99){
vErrors.length = _errs99;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs98 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceSha256 !== undefined){
let data55 = data.sourceSha256;
const _errs103 = errors;
if(errors === _errs103){
if(typeof data55 === "string"){
if(!pattern12.test(data55)){
validate52.errors = [{instancePath:instancePath+"/sourceSha256",schemaPath:"#/properties/sourceSha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/sourceSha256",schemaPath:"#/properties/sourceSha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs103 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.diagnosticSha256 !== undefined){
let data56 = data.diagnosticSha256;
const _errs105 = errors;
if(errors === _errs105){
if(typeof data56 === "string"){
if(!pattern12.test(data56)){
validate52.errors = [{instancePath:instancePath+"/diagnosticSha256",schemaPath:"#/properties/diagnosticSha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/diagnosticSha256",schemaPath:"#/properties/diagnosticSha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs105 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.coreSourceInputsSha256 !== undefined){
let data57 = data.coreSourceInputsSha256;
const _errs107 = errors;
if(errors === _errs107){
if(typeof data57 === "string"){
if(!pattern12.test(data57)){
validate52.errors = [{instancePath:instancePath+"/coreSourceInputsSha256",schemaPath:"#/properties/coreSourceInputsSha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/coreSourceInputsSha256",schemaPath:"#/properties/coreSourceInputsSha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs107 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkage !== undefined){
let data58 = data.linkage;
const _errs109 = errors;
if(errors === _errs109){
if(data58 && typeof data58 == "object" && !Array.isArray(data58)){
let missing2;
if((((data58.containerSource === undefined) && (missing2 = "containerSource")) || ((data58.value === undefined) && (missing2 = "value"))) || ((data58.encoding === undefined) && (missing2 = "encoding"))){
validate52.errors = [{instancePath:instancePath+"/linkage",schemaPath:"#/properties/linkage/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
const _errs111 = errors;
for(const key2 in data58){
if(!(((key2 === "containerSource") || (key2 === "value")) || (key2 === "encoding"))){
validate52.errors = [{instancePath:instancePath+"/linkage",schemaPath:"#/properties/linkage/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs111 === errors){
if(data58.containerSource !== undefined){
const _errs112 = errors;
if(!(validate53(data58.containerSource, {instancePath:instancePath+"/linkage/containerSource",parentData:data58,parentDataProperty:"containerSource",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate53.errors : vErrors.concat(validate53.errors);
errors = vErrors.length;
}
var valid7 = _errs112 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data58.value !== undefined){
const _errs113 = errors;
if(!(validate78(data58.value, {instancePath:instancePath+"/linkage/value",parentData:data58,parentDataProperty:"value",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var valid7 = _errs113 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data58.encoding !== undefined){
let data61 = data58.encoding;
const _errs114 = errors;
if(!((data61 === "utf8") || (data61 === "base64"))){
validate52.errors = [{instancePath:instancePath+"/linkage/encoding",schemaPath:"#/properties/linkage/properties/encoding/enum",keyword:"enum",params:{allowedValues: schema19.properties.linkage.properties.encoding.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid7 = _errs114 === errors;
}
else {
var valid7 = true;
}
}
}
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/linkage",schemaPath:"#/properties/linkage/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs109 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.resources !== undefined){
let data62 = data.resources;
const _errs115 = errors;
if(errors === _errs115){
if(data62 && typeof data62 == "object" && !Array.isArray(data62)){
let missing3;
if(((data62.admission === undefined) && (missing3 = "admission")) || ((data62.runtime === undefined) && (missing3 = "runtime"))){
validate52.errors = [{instancePath:instancePath+"/resources",schemaPath:"#/properties/resources/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
const _errs117 = errors;
for(const key3 in data62){
if(!((key3 === "admission") || (key3 === "runtime"))){
validate52.errors = [{instancePath:instancePath+"/resources",schemaPath:"#/properties/resources/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs117 === errors){
if(data62.admission !== undefined){
let data63 = data62.admission;
const _errs118 = errors;
if(errors === _errs118){
if(data63 && typeof data63 == "object" && !Array.isArray(data63)){
let missing4;
if(((((((((((((((((data63.maxPhysicalAndNativeSources === undefined) && (missing4 = "maxPhysicalAndNativeSources")) || ((data63.maxSourceBytes === undefined) && (missing4 = "maxSourceBytes"))) || ((data63.maxTotalSourceBytes === undefined) && (missing4 = "maxTotalSourceBytes"))) || ((data63.maxNativeLogicalAndTransformedSources === undefined) && (missing4 = "maxNativeLogicalAndTransformedSources"))) || ((data63.maxRecords === undefined) && (missing4 = "maxRecords"))) || ((data63.maxDiagnostics === undefined) && (missing4 = "maxDiagnostics"))) || ((data63.maxPolicyBytes === undefined) && (missing4 = "maxPolicyBytes"))) || ((data63.maxGitOutputBytes === undefined) && (missing4 = "maxGitOutputBytes"))) || ((data63.maxToolOutputBytes === undefined) && (missing4 = "maxToolOutputBytes"))) || ((data63.maxToolTimeMs === undefined) && (missing4 = "maxToolTimeMs"))) || ((data63.maxGitTimeMs === undefined) && (missing4 = "maxGitTimeMs"))) || ((data63.maxRequestIdCodePoints === undefined) && (missing4 = "maxRequestIdCodePoints"))) || ((data63.maxRequestBytes === undefined) && (missing4 = "maxRequestBytes"))) || ((data63.maxRequestPathCodePoints === undefined) && (missing4 = "maxRequestPathCodePoints"))) || ((data63.maxHumanPathCodePoints === undefined) && (missing4 = "maxHumanPathCodePoints"))) || ((data63.maxHumanPointerCodePoints === undefined) && (missing4 = "maxHumanPointerCodePoints"))){
validate52.errors = [{instancePath:instancePath+"/resources/admission",schemaPath:"#/properties/resources/properties/admission/required",keyword:"required",params:{missingProperty: missing4},message:"must have required property '"+missing4+"'"}];
return false;
}
else {
const _errs120 = errors;
for(const key4 in data63){
if(!(func1.call(schema19.properties.resources.properties.admission.properties, key4))){
validate52.errors = [{instancePath:instancePath+"/resources/admission",schemaPath:"#/properties/resources/properties/admission/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs120 === errors){
if(data63.maxPhysicalAndNativeSources !== undefined){
let data64 = data63.maxPhysicalAndNativeSources;
const _errs121 = errors;
const _errs122 = errors;
let valid10 = false;
const _errs123 = errors;
if(!(validate81(data64, {instancePath:instancePath+"/resources/admission/maxPhysicalAndNativeSources",parentData:data63,parentDataProperty:"maxPhysicalAndNativeSources",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid5 = _errs123 === errors;
valid10 = valid10 || _valid5;
const _errs124 = errors;
if(data64 !== null){
const err12 = {instancePath:instancePath+"/resources/admission/maxPhysicalAndNativeSources",schemaPath:"#/properties/resources/properties/admission/properties/maxPhysicalAndNativeSources/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
var _valid5 = _errs124 === errors;
valid10 = valid10 || _valid5;
if(!valid10){
const err13 = {instancePath:instancePath+"/resources/admission/maxPhysicalAndNativeSources",schemaPath:"#/properties/resources/properties/admission/properties/maxPhysicalAndNativeSources/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs122;
if(vErrors !== null){
if(_errs122){
vErrors.length = _errs122;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs121 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxSourceBytes !== undefined){
let data65 = data63.maxSourceBytes;
const _errs126 = errors;
const _errs127 = errors;
let valid11 = false;
const _errs128 = errors;
if(!(validate81(data65, {instancePath:instancePath+"/resources/admission/maxSourceBytes",parentData:data63,parentDataProperty:"maxSourceBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid6 = _errs128 === errors;
valid11 = valid11 || _valid6;
const _errs129 = errors;
if(data65 !== null){
const err14 = {instancePath:instancePath+"/resources/admission/maxSourceBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxSourceBytes/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
var _valid6 = _errs129 === errors;
valid11 = valid11 || _valid6;
if(!valid11){
const err15 = {instancePath:instancePath+"/resources/admission/maxSourceBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxSourceBytes/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs127;
if(vErrors !== null){
if(_errs127){
vErrors.length = _errs127;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs126 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxTotalSourceBytes !== undefined){
let data66 = data63.maxTotalSourceBytes;
const _errs131 = errors;
const _errs132 = errors;
let valid12 = false;
const _errs133 = errors;
if(!(validate81(data66, {instancePath:instancePath+"/resources/admission/maxTotalSourceBytes",parentData:data63,parentDataProperty:"maxTotalSourceBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid7 = _errs133 === errors;
valid12 = valid12 || _valid7;
const _errs134 = errors;
if(data66 !== null){
const err16 = {instancePath:instancePath+"/resources/admission/maxTotalSourceBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxTotalSourceBytes/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
var _valid7 = _errs134 === errors;
valid12 = valid12 || _valid7;
if(!valid12){
const err17 = {instancePath:instancePath+"/resources/admission/maxTotalSourceBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxTotalSourceBytes/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs132;
if(vErrors !== null){
if(_errs132){
vErrors.length = _errs132;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs131 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxNativeLogicalAndTransformedSources !== undefined){
let data67 = data63.maxNativeLogicalAndTransformedSources;
const _errs136 = errors;
const _errs137 = errors;
let valid13 = false;
const _errs138 = errors;
if(!(validate81(data67, {instancePath:instancePath+"/resources/admission/maxNativeLogicalAndTransformedSources",parentData:data63,parentDataProperty:"maxNativeLogicalAndTransformedSources",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid8 = _errs138 === errors;
valid13 = valid13 || _valid8;
const _errs139 = errors;
if(data67 !== null){
const err18 = {instancePath:instancePath+"/resources/admission/maxNativeLogicalAndTransformedSources",schemaPath:"#/properties/resources/properties/admission/properties/maxNativeLogicalAndTransformedSources/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid8 = _errs139 === errors;
valid13 = valid13 || _valid8;
if(!valid13){
const err19 = {instancePath:instancePath+"/resources/admission/maxNativeLogicalAndTransformedSources",schemaPath:"#/properties/resources/properties/admission/properties/maxNativeLogicalAndTransformedSources/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs137;
if(vErrors !== null){
if(_errs137){
vErrors.length = _errs137;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs136 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxRecords !== undefined){
let data68 = data63.maxRecords;
const _errs141 = errors;
const _errs142 = errors;
let valid14 = false;
const _errs143 = errors;
if(!(validate81(data68, {instancePath:instancePath+"/resources/admission/maxRecords",parentData:data63,parentDataProperty:"maxRecords",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid9 = _errs143 === errors;
valid14 = valid14 || _valid9;
const _errs144 = errors;
if(data68 !== null){
const err20 = {instancePath:instancePath+"/resources/admission/maxRecords",schemaPath:"#/properties/resources/properties/admission/properties/maxRecords/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
var _valid9 = _errs144 === errors;
valid14 = valid14 || _valid9;
if(!valid14){
const err21 = {instancePath:instancePath+"/resources/admission/maxRecords",schemaPath:"#/properties/resources/properties/admission/properties/maxRecords/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs142;
if(vErrors !== null){
if(_errs142){
vErrors.length = _errs142;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs141 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxDiagnostics !== undefined){
let data69 = data63.maxDiagnostics;
const _errs146 = errors;
const _errs147 = errors;
let valid15 = false;
const _errs148 = errors;
if(!(validate81(data69, {instancePath:instancePath+"/resources/admission/maxDiagnostics",parentData:data63,parentDataProperty:"maxDiagnostics",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid10 = _errs148 === errors;
valid15 = valid15 || _valid10;
const _errs149 = errors;
if(data69 !== null){
const err22 = {instancePath:instancePath+"/resources/admission/maxDiagnostics",schemaPath:"#/properties/resources/properties/admission/properties/maxDiagnostics/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
var _valid10 = _errs149 === errors;
valid15 = valid15 || _valid10;
if(!valid15){
const err23 = {instancePath:instancePath+"/resources/admission/maxDiagnostics",schemaPath:"#/properties/resources/properties/admission/properties/maxDiagnostics/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs147;
if(vErrors !== null){
if(_errs147){
vErrors.length = _errs147;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs146 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxPolicyBytes !== undefined){
let data70 = data63.maxPolicyBytes;
const _errs151 = errors;
const _errs152 = errors;
let valid16 = false;
const _errs153 = errors;
if(!(validate81(data70, {instancePath:instancePath+"/resources/admission/maxPolicyBytes",parentData:data63,parentDataProperty:"maxPolicyBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid11 = _errs153 === errors;
valid16 = valid16 || _valid11;
const _errs154 = errors;
if(data70 !== null){
const err24 = {instancePath:instancePath+"/resources/admission/maxPolicyBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxPolicyBytes/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
var _valid11 = _errs154 === errors;
valid16 = valid16 || _valid11;
if(!valid16){
const err25 = {instancePath:instancePath+"/resources/admission/maxPolicyBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxPolicyBytes/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs152;
if(vErrors !== null){
if(_errs152){
vErrors.length = _errs152;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs151 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxGitOutputBytes !== undefined){
let data71 = data63.maxGitOutputBytes;
const _errs156 = errors;
const _errs157 = errors;
let valid17 = false;
const _errs158 = errors;
if(!(validate81(data71, {instancePath:instancePath+"/resources/admission/maxGitOutputBytes",parentData:data63,parentDataProperty:"maxGitOutputBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid12 = _errs158 === errors;
valid17 = valid17 || _valid12;
const _errs159 = errors;
if(data71 !== null){
const err26 = {instancePath:instancePath+"/resources/admission/maxGitOutputBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxGitOutputBytes/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
var _valid12 = _errs159 === errors;
valid17 = valid17 || _valid12;
if(!valid17){
const err27 = {instancePath:instancePath+"/resources/admission/maxGitOutputBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxGitOutputBytes/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs157;
if(vErrors !== null){
if(_errs157){
vErrors.length = _errs157;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs156 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxToolOutputBytes !== undefined){
let data72 = data63.maxToolOutputBytes;
const _errs161 = errors;
const _errs162 = errors;
let valid18 = false;
const _errs163 = errors;
if(!(validate81(data72, {instancePath:instancePath+"/resources/admission/maxToolOutputBytes",parentData:data63,parentDataProperty:"maxToolOutputBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid13 = _errs163 === errors;
valid18 = valid18 || _valid13;
const _errs164 = errors;
if(data72 !== null){
const err28 = {instancePath:instancePath+"/resources/admission/maxToolOutputBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxToolOutputBytes/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
var _valid13 = _errs164 === errors;
valid18 = valid18 || _valid13;
if(!valid18){
const err29 = {instancePath:instancePath+"/resources/admission/maxToolOutputBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxToolOutputBytes/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs162;
if(vErrors !== null){
if(_errs162){
vErrors.length = _errs162;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs161 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxToolTimeMs !== undefined){
let data73 = data63.maxToolTimeMs;
const _errs166 = errors;
const _errs167 = errors;
let valid19 = false;
const _errs168 = errors;
if(!(validate81(data73, {instancePath:instancePath+"/resources/admission/maxToolTimeMs",parentData:data63,parentDataProperty:"maxToolTimeMs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid14 = _errs168 === errors;
valid19 = valid19 || _valid14;
const _errs169 = errors;
if(data73 !== null){
const err30 = {instancePath:instancePath+"/resources/admission/maxToolTimeMs",schemaPath:"#/properties/resources/properties/admission/properties/maxToolTimeMs/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
var _valid14 = _errs169 === errors;
valid19 = valid19 || _valid14;
if(!valid19){
const err31 = {instancePath:instancePath+"/resources/admission/maxToolTimeMs",schemaPath:"#/properties/resources/properties/admission/properties/maxToolTimeMs/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs167;
if(vErrors !== null){
if(_errs167){
vErrors.length = _errs167;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs166 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxGitTimeMs !== undefined){
let data74 = data63.maxGitTimeMs;
const _errs171 = errors;
const _errs172 = errors;
let valid20 = false;
const _errs173 = errors;
if(!(validate81(data74, {instancePath:instancePath+"/resources/admission/maxGitTimeMs",parentData:data63,parentDataProperty:"maxGitTimeMs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid15 = _errs173 === errors;
valid20 = valid20 || _valid15;
const _errs174 = errors;
if(data74 !== null){
const err32 = {instancePath:instancePath+"/resources/admission/maxGitTimeMs",schemaPath:"#/properties/resources/properties/admission/properties/maxGitTimeMs/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
var _valid15 = _errs174 === errors;
valid20 = valid20 || _valid15;
if(!valid20){
const err33 = {instancePath:instancePath+"/resources/admission/maxGitTimeMs",schemaPath:"#/properties/resources/properties/admission/properties/maxGitTimeMs/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs172;
if(vErrors !== null){
if(_errs172){
vErrors.length = _errs172;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs171 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxRequestIdCodePoints !== undefined){
let data75 = data63.maxRequestIdCodePoints;
const _errs176 = errors;
const _errs177 = errors;
let valid21 = false;
const _errs178 = errors;
if(!(validate81(data75, {instancePath:instancePath+"/resources/admission/maxRequestIdCodePoints",parentData:data63,parentDataProperty:"maxRequestIdCodePoints",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid16 = _errs178 === errors;
valid21 = valid21 || _valid16;
const _errs179 = errors;
if(data75 !== null){
const err34 = {instancePath:instancePath+"/resources/admission/maxRequestIdCodePoints",schemaPath:"#/properties/resources/properties/admission/properties/maxRequestIdCodePoints/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
var _valid16 = _errs179 === errors;
valid21 = valid21 || _valid16;
if(!valid21){
const err35 = {instancePath:instancePath+"/resources/admission/maxRequestIdCodePoints",schemaPath:"#/properties/resources/properties/admission/properties/maxRequestIdCodePoints/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs177;
if(vErrors !== null){
if(_errs177){
vErrors.length = _errs177;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs176 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxRequestBytes !== undefined){
let data76 = data63.maxRequestBytes;
const _errs181 = errors;
const _errs182 = errors;
let valid22 = false;
const _errs183 = errors;
if(!(validate81(data76, {instancePath:instancePath+"/resources/admission/maxRequestBytes",parentData:data63,parentDataProperty:"maxRequestBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid17 = _errs183 === errors;
valid22 = valid22 || _valid17;
const _errs184 = errors;
if(data76 !== null){
const err36 = {instancePath:instancePath+"/resources/admission/maxRequestBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxRequestBytes/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
var _valid17 = _errs184 === errors;
valid22 = valid22 || _valid17;
if(!valid22){
const err37 = {instancePath:instancePath+"/resources/admission/maxRequestBytes",schemaPath:"#/properties/resources/properties/admission/properties/maxRequestBytes/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs182;
if(vErrors !== null){
if(_errs182){
vErrors.length = _errs182;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs181 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxRequestPathCodePoints !== undefined){
let data77 = data63.maxRequestPathCodePoints;
const _errs186 = errors;
const _errs187 = errors;
let valid23 = false;
const _errs188 = errors;
if(!(validate81(data77, {instancePath:instancePath+"/resources/admission/maxRequestPathCodePoints",parentData:data63,parentDataProperty:"maxRequestPathCodePoints",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid18 = _errs188 === errors;
valid23 = valid23 || _valid18;
const _errs189 = errors;
if(data77 !== null){
const err38 = {instancePath:instancePath+"/resources/admission/maxRequestPathCodePoints",schemaPath:"#/properties/resources/properties/admission/properties/maxRequestPathCodePoints/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
var _valid18 = _errs189 === errors;
valid23 = valid23 || _valid18;
if(!valid23){
const err39 = {instancePath:instancePath+"/resources/admission/maxRequestPathCodePoints",schemaPath:"#/properties/resources/properties/admission/properties/maxRequestPathCodePoints/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs187;
if(vErrors !== null){
if(_errs187){
vErrors.length = _errs187;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs186 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxHumanPathCodePoints !== undefined){
let data78 = data63.maxHumanPathCodePoints;
const _errs191 = errors;
const _errs192 = errors;
let valid24 = false;
const _errs193 = errors;
if(!(validate81(data78, {instancePath:instancePath+"/resources/admission/maxHumanPathCodePoints",parentData:data63,parentDataProperty:"maxHumanPathCodePoints",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid19 = _errs193 === errors;
valid24 = valid24 || _valid19;
const _errs194 = errors;
if(data78 !== null){
const err40 = {instancePath:instancePath+"/resources/admission/maxHumanPathCodePoints",schemaPath:"#/properties/resources/properties/admission/properties/maxHumanPathCodePoints/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
var _valid19 = _errs194 === errors;
valid24 = valid24 || _valid19;
if(!valid24){
const err41 = {instancePath:instancePath+"/resources/admission/maxHumanPathCodePoints",schemaPath:"#/properties/resources/properties/admission/properties/maxHumanPathCodePoints/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs192;
if(vErrors !== null){
if(_errs192){
vErrors.length = _errs192;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs191 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data63.maxHumanPointerCodePoints !== undefined){
let data79 = data63.maxHumanPointerCodePoints;
const _errs196 = errors;
const _errs197 = errors;
let valid25 = false;
const _errs198 = errors;
if(!(validate81(data79, {instancePath:instancePath+"/resources/admission/maxHumanPointerCodePoints",parentData:data63,parentDataProperty:"maxHumanPointerCodePoints",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid20 = _errs198 === errors;
valid25 = valid25 || _valid20;
const _errs199 = errors;
if(data79 !== null){
const err42 = {instancePath:instancePath+"/resources/admission/maxHumanPointerCodePoints",schemaPath:"#/properties/resources/properties/admission/properties/maxHumanPointerCodePoints/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
var _valid20 = _errs199 === errors;
valid25 = valid25 || _valid20;
if(!valid25){
const err43 = {instancePath:instancePath+"/resources/admission/maxHumanPointerCodePoints",schemaPath:"#/properties/resources/properties/admission/properties/maxHumanPointerCodePoints/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs197;
if(vErrors !== null){
if(_errs197){
vErrors.length = _errs197;
}
else {
vErrors = null;
}
}
}
var valid9 = _errs196 === errors;
}
else {
var valid9 = true;
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
}
}
}
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/resources/admission",schemaPath:"#/properties/resources/properties/admission/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid8 = _errs118 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data62.runtime !== undefined){
let data80 = data62.runtime;
const _errs201 = errors;
if(errors === _errs201){
if(data80 && typeof data80 == "object" && !Array.isArray(data80)){
let missing5;
if((((((data80.maxManagedMemoryBytes === undefined) && (missing5 = "maxManagedMemoryBytes")) || ((data80.maxTemporaryBytes === undefined) && (missing5 = "maxTemporaryBytes"))) || ((data80.maxNestingDepth === undefined) && (missing5 = "maxNestingDepth"))) || ((data80.maxCheckTimeMs === undefined) && (missing5 = "maxCheckTimeMs"))) || ((data80.terminationGraceMs === undefined) && (missing5 = "terminationGraceMs"))){
validate52.errors = [{instancePath:instancePath+"/resources/runtime",schemaPath:"#/properties/resources/properties/runtime/required",keyword:"required",params:{missingProperty: missing5},message:"must have required property '"+missing5+"'"}];
return false;
}
else {
const _errs203 = errors;
for(const key5 in data80){
if(!(((((key5 === "maxManagedMemoryBytes") || (key5 === "maxTemporaryBytes")) || (key5 === "maxNestingDepth")) || (key5 === "maxCheckTimeMs")) || (key5 === "terminationGraceMs"))){
validate52.errors = [{instancePath:instancePath+"/resources/runtime",schemaPath:"#/properties/resources/properties/runtime/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs203 === errors){
if(data80.maxManagedMemoryBytes !== undefined){
let data81 = data80.maxManagedMemoryBytes;
const _errs204 = errors;
const _errs205 = errors;
let valid27 = false;
const _errs206 = errors;
if(!(validate81(data81, {instancePath:instancePath+"/resources/runtime/maxManagedMemoryBytes",parentData:data80,parentDataProperty:"maxManagedMemoryBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid21 = _errs206 === errors;
valid27 = valid27 || _valid21;
const _errs207 = errors;
if(data81 !== null){
const err44 = {instancePath:instancePath+"/resources/runtime/maxManagedMemoryBytes",schemaPath:"#/properties/resources/properties/runtime/properties/maxManagedMemoryBytes/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
var _valid21 = _errs207 === errors;
valid27 = valid27 || _valid21;
if(!valid27){
const err45 = {instancePath:instancePath+"/resources/runtime/maxManagedMemoryBytes",schemaPath:"#/properties/resources/properties/runtime/properties/maxManagedMemoryBytes/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs205;
if(vErrors !== null){
if(_errs205){
vErrors.length = _errs205;
}
else {
vErrors = null;
}
}
}
var valid26 = _errs204 === errors;
}
else {
var valid26 = true;
}
if(valid26){
if(data80.maxTemporaryBytes !== undefined){
let data82 = data80.maxTemporaryBytes;
const _errs209 = errors;
const _errs210 = errors;
let valid28 = false;
const _errs211 = errors;
if(!(validate81(data82, {instancePath:instancePath+"/resources/runtime/maxTemporaryBytes",parentData:data80,parentDataProperty:"maxTemporaryBytes",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid22 = _errs211 === errors;
valid28 = valid28 || _valid22;
const _errs212 = errors;
if(data82 !== null){
const err46 = {instancePath:instancePath+"/resources/runtime/maxTemporaryBytes",schemaPath:"#/properties/resources/properties/runtime/properties/maxTemporaryBytes/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
var _valid22 = _errs212 === errors;
valid28 = valid28 || _valid22;
if(!valid28){
const err47 = {instancePath:instancePath+"/resources/runtime/maxTemporaryBytes",schemaPath:"#/properties/resources/properties/runtime/properties/maxTemporaryBytes/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs210;
if(vErrors !== null){
if(_errs210){
vErrors.length = _errs210;
}
else {
vErrors = null;
}
}
}
var valid26 = _errs209 === errors;
}
else {
var valid26 = true;
}
if(valid26){
if(data80.maxNestingDepth !== undefined){
let data83 = data80.maxNestingDepth;
const _errs214 = errors;
const _errs215 = errors;
let valid29 = false;
const _errs216 = errors;
if(!(validate81(data83, {instancePath:instancePath+"/resources/runtime/maxNestingDepth",parentData:data80,parentDataProperty:"maxNestingDepth",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid23 = _errs216 === errors;
valid29 = valid29 || _valid23;
const _errs217 = errors;
if(data83 !== null){
const err48 = {instancePath:instancePath+"/resources/runtime/maxNestingDepth",schemaPath:"#/properties/resources/properties/runtime/properties/maxNestingDepth/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
var _valid23 = _errs217 === errors;
valid29 = valid29 || _valid23;
if(!valid29){
const err49 = {instancePath:instancePath+"/resources/runtime/maxNestingDepth",schemaPath:"#/properties/resources/properties/runtime/properties/maxNestingDepth/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs215;
if(vErrors !== null){
if(_errs215){
vErrors.length = _errs215;
}
else {
vErrors = null;
}
}
}
var valid26 = _errs214 === errors;
}
else {
var valid26 = true;
}
if(valid26){
if(data80.maxCheckTimeMs !== undefined){
let data84 = data80.maxCheckTimeMs;
const _errs219 = errors;
const _errs220 = errors;
let valid30 = false;
const _errs221 = errors;
if(!(validate81(data84, {instancePath:instancePath+"/resources/runtime/maxCheckTimeMs",parentData:data80,parentDataProperty:"maxCheckTimeMs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid24 = _errs221 === errors;
valid30 = valid30 || _valid24;
const _errs222 = errors;
if(data84 !== null){
const err50 = {instancePath:instancePath+"/resources/runtime/maxCheckTimeMs",schemaPath:"#/properties/resources/properties/runtime/properties/maxCheckTimeMs/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
var _valid24 = _errs222 === errors;
valid30 = valid30 || _valid24;
if(!valid30){
const err51 = {instancePath:instancePath+"/resources/runtime/maxCheckTimeMs",schemaPath:"#/properties/resources/properties/runtime/properties/maxCheckTimeMs/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs220;
if(vErrors !== null){
if(_errs220){
vErrors.length = _errs220;
}
else {
vErrors = null;
}
}
}
var valid26 = _errs219 === errors;
}
else {
var valid26 = true;
}
if(valid26){
if(data80.terminationGraceMs !== undefined){
let data85 = data80.terminationGraceMs;
const _errs224 = errors;
const _errs225 = errors;
let valid31 = false;
const _errs226 = errors;
if(!(validate81(data85, {instancePath:instancePath+"/resources/runtime/terminationGraceMs",parentData:data80,parentDataProperty:"terminationGraceMs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid25 = _errs226 === errors;
valid31 = valid31 || _valid25;
const _errs227 = errors;
if(data85 !== null){
const err52 = {instancePath:instancePath+"/resources/runtime/terminationGraceMs",schemaPath:"#/properties/resources/properties/runtime/properties/terminationGraceMs/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
var _valid25 = _errs227 === errors;
valid31 = valid31 || _valid25;
if(!valid31){
const err53 = {instancePath:instancePath+"/resources/runtime/terminationGraceMs",schemaPath:"#/properties/resources/properties/runtime/properties/terminationGraceMs/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs225;
if(vErrors !== null){
if(_errs225){
vErrors.length = _errs225;
}
else {
vErrors = null;
}
}
}
var valid26 = _errs224 === errors;
}
else {
var valid26 = true;
}
}
}
}
}
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/resources/runtime",schemaPath:"#/properties/resources/properties/runtime/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid8 = _errs201 === errors;
}
else {
var valid8 = true;
}
}
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/resources",schemaPath:"#/properties/resources/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs115 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.code !== undefined){
let data86 = data.code;
const _errs229 = errors;
if(errors === _errs229){
if(typeof data86 === "string"){
if(func2(data86) > 256){
validate52.errors = [{instancePath:instancePath+"/code",schemaPath:"#/properties/code/maxLength",keyword:"maxLength",params:{limit: 256},message:"must NOT have more than 256 characters"}];
return false;
}
else {
if(func2(data86) < 1){
validate52.errors = [{instancePath:instancePath+"/code",schemaPath:"#/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/code",schemaPath:"#/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs229 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.message !== undefined){
let data87 = data.message;
const _errs231 = errors;
if(errors === _errs231){
if(typeof data87 === "string"){
if(func2(data87) < 1){
validate52.errors = [{instancePath:instancePath+"/message",schemaPath:"#/properties/message/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/message",schemaPath:"#/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs231 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.truncated !== undefined){
const _errs233 = errors;
if(typeof data.truncated !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/truncated",schemaPath:"#/properties/truncated/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs233 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.complete !== undefined){
const _errs235 = errors;
if(typeof data.complete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/complete",schemaPath:"#/properties/complete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs235 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.operation !== undefined){
let data90 = data.operation;
const _errs237 = errors;
if(!((data90 === "format") || (data90 === "normalize"))){
validate52.errors = [{instancePath:instancePath+"/operation",schemaPath:"#/properties/operation/enum",keyword:"enum",params:{allowedValues: schema19.properties.operation.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs237 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.selectedPathCount !== undefined){
const _errs238 = errors;
if(!(validate75(data.selectedPathCount, {instancePath:instancePath+"/selectedPathCount",parentData:data,parentDataProperty:"selectedPathCount",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs238 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.changedPathCount !== undefined){
const _errs239 = errors;
if(!(validate75(data.changedPathCount, {instancePath:instancePath+"/changedPathCount",parentData:data,parentDataProperty:"changedPathCount",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs239 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.preflightComplete !== undefined){
const _errs240 = errors;
if(typeof data.preflightComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/preflightComplete",schemaPath:"#/properties/preflightComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs240 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.writesComplete !== undefined){
const _errs242 = errors;
if(typeof data.writesComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/writesComplete",schemaPath:"#/properties/writesComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs242 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.uncertainPath !== undefined){
let data95 = data.uncertainPath;
const _errs244 = errors;
const _errs245 = errors;
let valid32 = false;
const _errs246 = errors;
if(errors === _errs246){
if(typeof data95 === "string"){
if(func2(data95) < 1){
const err54 = {instancePath:instancePath+"/uncertainPath",schemaPath:"#/properties/uncertainPath/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
else {
const err55 = {instancePath:instancePath+"/uncertainPath",schemaPath:"#/properties/uncertainPath/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
var _valid26 = _errs246 === errors;
valid32 = valid32 || _valid26;
const _errs248 = errors;
if(data95 !== null){
const err56 = {instancePath:instancePath+"/uncertainPath",schemaPath:"#/properties/uncertainPath/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
var _valid26 = _errs248 === errors;
valid32 = valid32 || _valid26;
if(!valid32){
const err57 = {instancePath:instancePath+"/uncertainPath",schemaPath:"#/properties/uncertainPath/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs245;
if(vErrors !== null){
if(_errs245){
vErrors.length = _errs245;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs244 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.writtenPathCount !== undefined){
const _errs250 = errors;
if(!(validate75(data.writtenPathCount, {instancePath:instancePath+"/writtenPathCount",parentData:data,parentDataProperty:"writtenPathCount",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs250 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.configurationOrigin !== undefined){
let data97 = data.configurationOrigin;
const _errs251 = errors;
const _errs252 = errors;
let valid33 = false;
let passing0 = null;
const _errs253 = errors;
if(errors === _errs253){
if(data97 && typeof data97 == "object" && !Array.isArray(data97)){
let missing6;
if(((data97.kind === undefined) && (missing6 = "kind")) || ((data97.path === undefined) && (missing6 = "path"))){
const err58 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/0/required",keyword:"required",params:{missingProperty: missing6},message:"must have required property '"+missing6+"'"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
else {
const _errs255 = errors;
for(const key6 in data97){
if(!((key6 === "kind") || (key6 === "path"))){
const err59 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
break;
}
}
if(_errs255 === errors){
if(data97.kind !== undefined){
const _errs256 = errors;
if("repository-file" !== data97.kind){
const err60 = {instancePath:instancePath+"/configurationOrigin/kind",schemaPath:"#/properties/configurationOrigin/oneOf/0/properties/kind/const",keyword:"const",params:{allowedValue: "repository-file"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
var valid34 = _errs256 === errors;
}
else {
var valid34 = true;
}
if(valid34){
if(data97.path !== undefined){
const _errs257 = errors;
if(".json-quality.json" !== data97.path){
const err61 = {instancePath:instancePath+"/configurationOrigin/path",schemaPath:"#/properties/configurationOrigin/oneOf/0/properties/path/const",keyword:"const",params:{allowedValue: ".json-quality.json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
var valid34 = _errs257 === errors;
}
else {
var valid34 = true;
}
}
}
}
}
else {
const err62 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
var _valid27 = _errs253 === errors;
if(_valid27){
valid33 = true;
passing0 = 0;
var props3 = true;
}
const _errs258 = errors;
if(errors === _errs258){
if(data97 && typeof data97 == "object" && !Array.isArray(data97)){
let missing7;
if(((data97.kind === undefined) && (missing7 = "kind")) || ((data97.path === undefined) && (missing7 = "path"))){
const err63 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/1/required",keyword:"required",params:{missingProperty: missing7},message:"must have required property '"+missing7+"'"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
else {
const _errs260 = errors;
for(const key7 in data97){
if(!((key7 === "kind") || (key7 === "path"))){
const err64 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key7},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
break;
}
}
if(_errs260 === errors){
if(data97.kind !== undefined){
const _errs261 = errors;
if("repository-absence" !== data97.kind){
const err65 = {instancePath:instancePath+"/configurationOrigin/kind",schemaPath:"#/properties/configurationOrigin/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "repository-absence"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
var valid35 = _errs261 === errors;
}
else {
var valid35 = true;
}
if(valid35){
if(data97.path !== undefined){
const _errs262 = errors;
if(".json-quality.json" !== data97.path){
const err66 = {instancePath:instancePath+"/configurationOrigin/path",schemaPath:"#/properties/configurationOrigin/oneOf/1/properties/path/const",keyword:"const",params:{allowedValue: ".json-quality.json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
var valid35 = _errs262 === errors;
}
else {
var valid35 = true;
}
}
}
}
}
else {
const err67 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
}
var _valid27 = _errs258 === errors;
if(_valid27 && valid33){
valid33 = false;
passing0 = [passing0, 1];
}
else {
if(_valid27){
valid33 = true;
passing0 = 1;
if(props3 !== true){
props3 = true;
}
}
const _errs263 = errors;
if(errors === _errs263){
if(data97 && typeof data97 == "object" && !Array.isArray(data97)){
let missing8;
if(((((data97.kind === undefined) && (missing8 = "kind")) || ((data97.path === undefined) && (missing8 = "path"))) || ((data97.commitId === undefined) && (missing8 = "commitId"))) || ((data97.blobId === undefined) && (missing8 = "blobId"))){
const err68 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/2/required",keyword:"required",params:{missingProperty: missing8},message:"must have required property '"+missing8+"'"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
else {
const _errs265 = errors;
for(const key8 in data97){
if(!((((key8 === "kind") || (key8 === "path")) || (key8 === "commitId")) || (key8 === "blobId"))){
const err69 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key8},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
break;
}
}
if(_errs265 === errors){
if(data97.kind !== undefined){
const _errs266 = errors;
if("git-blob" !== data97.kind){
const err70 = {instancePath:instancePath+"/configurationOrigin/kind",schemaPath:"#/properties/configurationOrigin/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "git-blob"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
var valid36 = _errs266 === errors;
}
else {
var valid36 = true;
}
if(valid36){
if(data97.path !== undefined){
const _errs267 = errors;
if(".json-quality.json" !== data97.path){
const err71 = {instancePath:instancePath+"/configurationOrigin/path",schemaPath:"#/properties/configurationOrigin/oneOf/2/properties/path/const",keyword:"const",params:{allowedValue: ".json-quality.json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
var valid36 = _errs267 === errors;
}
else {
var valid36 = true;
}
if(valid36){
if(data97.commitId !== undefined){
let data104 = data97.commitId;
const _errs268 = errors;
if(errors === _errs268){
if(typeof data104 === "string"){
if(!pattern3.test(data104)){
const err72 = {instancePath:instancePath+"/configurationOrigin/commitId",schemaPath:"#/properties/configurationOrigin/oneOf/2/properties/commitId/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{40}$"},message:"must match pattern \""+"^[a-f0-9]{40}$"+"\""};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
}
else {
const err73 = {instancePath:instancePath+"/configurationOrigin/commitId",schemaPath:"#/properties/configurationOrigin/oneOf/2/properties/commitId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
var valid36 = _errs268 === errors;
}
else {
var valid36 = true;
}
if(valid36){
if(data97.blobId !== undefined){
let data105 = data97.blobId;
const _errs270 = errors;
if(errors === _errs270){
if(typeof data105 === "string"){
if(!pattern3.test(data105)){
const err74 = {instancePath:instancePath+"/configurationOrigin/blobId",schemaPath:"#/properties/configurationOrigin/oneOf/2/properties/blobId/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{40}$"},message:"must match pattern \""+"^[a-f0-9]{40}$"+"\""};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
}
else {
const err75 = {instancePath:instancePath+"/configurationOrigin/blobId",schemaPath:"#/properties/configurationOrigin/oneOf/2/properties/blobId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
var valid36 = _errs270 === errors;
}
else {
var valid36 = true;
}
}
}
}
}
}
}
else {
const err76 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
var _valid27 = _errs263 === errors;
if(_valid27 && valid33){
valid33 = false;
passing0 = [passing0, 2];
}
else {
if(_valid27){
valid33 = true;
passing0 = 2;
if(props3 !== true){
props3 = true;
}
}
const _errs272 = errors;
if(errors === _errs272){
if(data97 && typeof data97 == "object" && !Array.isArray(data97)){
let missing9;
if((((data97.kind === undefined) && (missing9 = "kind")) || ((data97.path === undefined) && (missing9 = "path"))) || ((data97.commitId === undefined) && (missing9 = "commitId"))){
const err77 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/3/required",keyword:"required",params:{missingProperty: missing9},message:"must have required property '"+missing9+"'"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
else {
const _errs274 = errors;
for(const key9 in data97){
if(!(((key9 === "kind") || (key9 === "path")) || (key9 === "commitId"))){
const err78 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key9},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
break;
}
}
if(_errs274 === errors){
if(data97.kind !== undefined){
const _errs275 = errors;
if("git-absence" !== data97.kind){
const err79 = {instancePath:instancePath+"/configurationOrigin/kind",schemaPath:"#/properties/configurationOrigin/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "git-absence"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
var valid37 = _errs275 === errors;
}
else {
var valid37 = true;
}
if(valid37){
if(data97.path !== undefined){
const _errs276 = errors;
if(".json-quality.json" !== data97.path){
const err80 = {instancePath:instancePath+"/configurationOrigin/path",schemaPath:"#/properties/configurationOrigin/oneOf/3/properties/path/const",keyword:"const",params:{allowedValue: ".json-quality.json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
var valid37 = _errs276 === errors;
}
else {
var valid37 = true;
}
if(valid37){
if(data97.commitId !== undefined){
let data108 = data97.commitId;
const _errs277 = errors;
if(errors === _errs277){
if(typeof data108 === "string"){
if(!pattern3.test(data108)){
const err81 = {instancePath:instancePath+"/configurationOrigin/commitId",schemaPath:"#/properties/configurationOrigin/oneOf/3/properties/commitId/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{40}$"},message:"must match pattern \""+"^[a-f0-9]{40}$"+"\""};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
}
else {
const err82 = {instancePath:instancePath+"/configurationOrigin/commitId",schemaPath:"#/properties/configurationOrigin/oneOf/3/properties/commitId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
}
var valid37 = _errs277 === errors;
}
else {
var valid37 = true;
}
}
}
}
}
}
else {
const err83 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
}
var _valid27 = _errs272 === errors;
if(_valid27 && valid33){
valid33 = false;
passing0 = [passing0, 3];
}
else {
if(_valid27){
valid33 = true;
passing0 = 3;
if(props3 !== true){
props3 = true;
}
}
}
}
}
if(!valid33){
const err84 = {instancePath:instancePath+"/configurationOrigin",schemaPath:"#/properties/configurationOrigin/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs252;
if(vErrors !== null){
if(_errs252){
vErrors.length = _errs252;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs251 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.defaultPolicySha256 !== undefined){
let data109 = data.defaultPolicySha256;
const _errs279 = errors;
if(errors === _errs279){
if(typeof data109 === "string"){
if(!pattern12.test(data109)){
validate52.errors = [{instancePath:instancePath+"/defaultPolicySha256",schemaPath:"#/properties/defaultPolicySha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/defaultPolicySha256",schemaPath:"#/properties/defaultPolicySha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs279 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.policyResolverInputsSha256 !== undefined){
let data110 = data.policyResolverInputsSha256;
const _errs281 = errors;
if(errors === _errs281){
if(typeof data110 === "string"){
if(!pattern12.test(data110)){
validate52.errors = [{instancePath:instancePath+"/policyResolverInputsSha256",schemaPath:"#/properties/policyResolverInputsSha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/policyResolverInputsSha256",schemaPath:"#/properties/policyResolverInputsSha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs281 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.configurationBytesSha256 !== undefined){
let data111 = data.configurationBytesSha256;
const _errs283 = errors;
if(errors === _errs283){
if(typeof data111 === "string"){
if(!pattern12.test(data111)){
validate52.errors = [{instancePath:instancePath+"/configurationBytesSha256",schemaPath:"#/properties/configurationBytesSha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/configurationBytesSha256",schemaPath:"#/properties/configurationBytesSha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs283 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.policyInputsSha256 !== undefined){
let data112 = data.policyInputsSha256;
const _errs285 = errors;
if(errors === _errs285){
if(typeof data112 === "string"){
if(!pattern12.test(data112)){
validate52.errors = [{instancePath:instancePath+"/policyInputsSha256",schemaPath:"#/properties/policyInputsSha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/policyInputsSha256",schemaPath:"#/properties/policyInputsSha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs285 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.configurationByteLength !== undefined){
const _errs287 = errors;
if(!(validate75(data.configurationByteLength, {instancePath:instancePath+"/configurationByteLength",parentData:data,parentDataProperty:"configurationByteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs287 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.formatEligible !== undefined){
const _errs288 = errors;
if(typeof data.formatEligible !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/formatEligible",schemaPath:"#/properties/formatEligible/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs288 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.normalizeEligible !== undefined){
const _errs290 = errors;
if(typeof data.normalizeEligible !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/normalizeEligible",schemaPath:"#/properties/normalizeEligible/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs290 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.containerValue !== undefined){
const _errs292 = errors;
if(!(validate78(data.containerValue, {instancePath:instancePath+"/containerValue",parentData:data,parentDataProperty:"containerValue",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var valid0 = _errs292 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.priorValue !== undefined){
const _errs293 = errors;
if(!(validate78(data.priorValue, {instancePath:instancePath+"/priorValue",parentData:data,parentDataProperty:"priorValue",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var valid0 = _errs293 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.priorLine !== undefined){
const _errs294 = errors;
if(!(validate81(data.priorLine, {instancePath:instancePath+"/priorLine",parentData:data,parentDataProperty:"priorLine",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs294 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.priorColumn !== undefined){
const _errs295 = errors;
if(!(validate81(data.priorColumn, {instancePath:instancePath+"/priorColumn",parentData:data,parentDataProperty:"priorColumn",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs295 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.priorEndLine !== undefined){
const _errs296 = errors;
if(!(validate81(data.priorEndLine, {instancePath:instancePath+"/priorEndLine",parentData:data,parentDataProperty:"priorEndLine",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs296 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.priorEndColumn !== undefined){
const _errs297 = errors;
if(!(validate81(data.priorEndColumn, {instancePath:instancePath+"/priorEndColumn",parentData:data,parentDataProperty:"priorEndColumn",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs297 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.normalizedSha256 !== undefined){
let data122 = data.normalizedSha256;
const _errs298 = errors;
if(errors === _errs298){
if(typeof data122 === "string"){
if(!pattern12.test(data122)){
validate52.errors = [{instancePath:instancePath+"/normalizedSha256",schemaPath:"#/properties/normalizedSha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/normalizedSha256",schemaPath:"#/properties/normalizedSha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs298 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.normalizedByteLength !== undefined){
const _errs300 = errors;
if(!(validate75(data.normalizedByteLength, {instancePath:instancePath+"/normalizedByteLength",parentData:data,parentDataProperty:"normalizedByteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs300 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceByteLength !== undefined){
const _errs301 = errors;
if(!(validate75(data.sourceByteLength, {instancePath:instancePath+"/sourceByteLength",parentData:data,parentDataProperty:"sourceByteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs301 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.pointer !== undefined){
let data125 = data.pointer;
const _errs302 = errors;
if(errors === _errs302){
if(typeof data125 === "string"){
if(!pattern11.test(data125)){
validate52.errors = [{instancePath:instancePath+"/pointer",schemaPath:"#/properties/pointer/pattern",keyword:"pattern",params:{pattern: "^(?:/(?:[^~/]|~[01])*)*$"},message:"must match pattern \""+"^(?:/(?:[^~/]|~[01])*)*$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/pointer",schemaPath:"#/properties/pointer/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs302 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.icuVersion !== undefined){
let data126 = data.icuVersion;
const _errs304 = errors;
if(errors === _errs304){
if(typeof data126 === "string"){
if(func2(data126) < 1){
validate52.errors = [{instancePath:instancePath+"/icuVersion",schemaPath:"#/properties/icuVersion/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/icuVersion",schemaPath:"#/properties/icuVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs304 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unicodeVersion !== undefined){
let data127 = data.unicodeVersion;
const _errs306 = errors;
if(errors === _errs306){
if(typeof data127 === "string"){
if(func2(data127) < 1){
validate52.errors = [{instancePath:instancePath+"/unicodeVersion",schemaPath:"#/properties/unicodeVersion/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/unicodeVersion",schemaPath:"#/properties/unicodeVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs306 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.decodedByteLength !== undefined){
const _errs308 = errors;
if(!(validate75(data.decodedByteLength, {instancePath:instancePath+"/decodedByteLength",parentData:data,parentDataProperty:"decodedByteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs308 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.decodedSha256 !== undefined){
let data129 = data.decodedSha256;
const _errs309 = errors;
if(errors === _errs309){
if(typeof data129 === "string"){
if(!pattern12.test(data129)){
validate52.errors = [{instancePath:instancePath+"/decodedSha256",schemaPath:"#/properties/decodedSha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/decodedSha256",schemaPath:"#/properties/decodedSha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs309 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.operationScope !== undefined){
let data130 = data.operationScope;
const _errs311 = errors;
const _errs313 = errors;
let valid38 = false;
let passing1 = null;
const _errs314 = errors;
if(data130 && typeof data130 == "object" && !Array.isArray(data130)){
if(data130.kind !== undefined){
const _errs315 = errors;
if("repository" !== data130.kind){
const err85 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/properties/operationScope/oneOf/0/properties/kind/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
var valid39 = _errs315 === errors;
}
else {
var valid39 = true;
}
if(valid39){
if(data130.policy !== undefined){
const _errs316 = errors;
if("repository" !== data130.policy){
const err86 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/properties/operationScope/oneOf/0/properties/policy/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
var valid39 = _errs316 === errors;
}
else {
var valid39 = true;
}
}
}
var _valid28 = _errs314 === errors;
if(_valid28){
valid38 = true;
passing1 = 0;
var props4 = {};
props4.kind = true;
props4.policy = true;
}
const _errs317 = errors;
if(data130 && typeof data130 == "object" && !Array.isArray(data130)){
if(data130.kind !== undefined){
const _errs318 = errors;
if("selected-files" !== data130.kind){
const err87 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/properties/operationScope/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "selected-files"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
var valid40 = _errs318 === errors;
}
else {
var valid40 = true;
}
if(valid40){
if(data130.policy !== undefined){
const _errs319 = errors;
if("repository" !== data130.policy){
const err88 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/properties/operationScope/oneOf/1/properties/policy/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
var valid40 = _errs319 === errors;
}
else {
var valid40 = true;
}
if(valid40){
if(data130.completeRepositoryCheck !== undefined){
const _errs320 = errors;
if(false !== data130.completeRepositoryCheck){
const err89 = {instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/properties/operationScope/oneOf/1/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
var valid40 = _errs320 === errors;
}
else {
var valid40 = true;
}
}
}
}
var _valid28 = _errs317 === errors;
if(_valid28 && valid38){
valid38 = false;
passing1 = [passing1, 1];
}
else {
if(_valid28){
valid38 = true;
passing1 = 1;
if(props4 !== true){
props4 = props4 || {};
props4.kind = true;
props4.policy = true;
props4.completeRepositoryCheck = true;
}
}
const _errs321 = errors;
if(data130 && typeof data130 == "object" && !Array.isArray(data130)){
if(data130.kind !== undefined){
const _errs322 = errors;
if("stdin" !== data130.kind){
const err90 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/properties/operationScope/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "stdin"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
var valid41 = _errs322 === errors;
}
else {
var valid41 = true;
}
if(valid41){
if(data130.policy !== undefined){
let data137 = data130.policy;
const _errs323 = errors;
if(!((data137 === "repository") || (data137 === "explicit-contract"))){
const err91 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/properties/operationScope/oneOf/2/properties/policy/enum",keyword:"enum",params:{allowedValues: schema19.properties.operationScope.oneOf[2].properties.policy.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
var valid41 = _errs323 === errors;
}
else {
var valid41 = true;
}
if(valid41){
if(data130.completeRepositoryCheck !== undefined){
const _errs324 = errors;
if(false !== data130.completeRepositoryCheck){
const err92 = {instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/properties/operationScope/oneOf/2/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
var valid41 = _errs324 === errors;
}
else {
var valid41 = true;
}
}
}
}
var _valid28 = _errs321 === errors;
if(_valid28 && valid38){
valid38 = false;
passing1 = [passing1, 2];
}
else {
if(_valid28){
valid38 = true;
passing1 = 2;
if(props4 !== true){
props4 = props4 || {};
props4.kind = true;
props4.policy = true;
props4.completeRepositoryCheck = true;
}
}
const _errs325 = errors;
if(data130 && typeof data130 == "object" && !Array.isArray(data130)){
if(data130.kind !== undefined){
const _errs326 = errors;
if("immutable-git-json" !== data130.kind){
const err93 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/properties/operationScope/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "immutable-git-json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
var valid42 = _errs326 === errors;
}
else {
var valid42 = true;
}
if(valid42){
if(data130.policy !== undefined){
const _errs327 = errors;
if("trusted-git" !== data130.policy){
const err94 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/properties/operationScope/oneOf/3/properties/policy/const",keyword:"const",params:{allowedValue: "trusted-git"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
var valid42 = _errs327 === errors;
}
else {
var valid42 = true;
}
if(valid42){
if(data130.completeRepositoryCheck !== undefined){
const _errs328 = errors;
if(false !== data130.completeRepositoryCheck){
const err95 = {instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/properties/operationScope/oneOf/3/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
var valid42 = _errs328 === errors;
}
else {
var valid42 = true;
}
}
}
}
var _valid28 = _errs325 === errors;
if(_valid28 && valid38){
valid38 = false;
passing1 = [passing1, 3];
}
else {
if(_valid28){
valid38 = true;
passing1 = 3;
if(props4 !== true){
props4 = props4 || {};
props4.kind = true;
props4.policy = true;
props4.completeRepositoryCheck = true;
}
}
}
}
}
if(!valid38){
const err96 = {instancePath:instancePath+"/operationScope",schemaPath:"#/properties/operationScope/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs313;
if(vErrors !== null){
if(_errs313){
vErrors.length = _errs313;
}
else {
vErrors = null;
}
}
}
if(errors === _errs311){
if(data130 && typeof data130 == "object" && !Array.isArray(data130)){
let missing10;
if((((data130.kind === undefined) && (missing10 = "kind")) || ((data130.policy === undefined) && (missing10 = "policy"))) || ((data130.completeRepositoryCheck === undefined) && (missing10 = "completeRepositoryCheck"))){
validate52.errors = [{instancePath:instancePath+"/operationScope",schemaPath:"#/properties/operationScope/required",keyword:"required",params:{missingProperty: missing10},message:"must have required property '"+missing10+"'"}];
return false;
}
else {
const _errs329 = errors;
for(const key10 in data130){
if(!(((key10 === "kind") || (key10 === "policy")) || (key10 === "completeRepositoryCheck"))){
validate52.errors = [{instancePath:instancePath+"/operationScope",schemaPath:"#/properties/operationScope/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key10},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs329 === errors){
if(data130.kind !== undefined){
let data142 = data130.kind;
const _errs330 = errors;
if(!((((data142 === "repository") || (data142 === "selected-files")) || (data142 === "stdin")) || (data142 === "immutable-git-json"))){
validate52.errors = [{instancePath:instancePath+"/operationScope/kind",schemaPath:"#/properties/operationScope/properties/kind/enum",keyword:"enum",params:{allowedValues: schema19.properties.operationScope.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid43 = _errs330 === errors;
}
else {
var valid43 = true;
}
if(valid43){
if(data130.policy !== undefined){
let data143 = data130.policy;
const _errs331 = errors;
if(!(((data143 === "repository") || (data143 === "explicit-contract")) || (data143 === "trusted-git"))){
validate52.errors = [{instancePath:instancePath+"/operationScope/policy",schemaPath:"#/properties/operationScope/properties/policy/enum",keyword:"enum",params:{allowedValues: schema19.properties.operationScope.properties.policy.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid43 = _errs331 === errors;
}
else {
var valid43 = true;
}
if(valid43){
if(data130.completeRepositoryCheck !== undefined){
const _errs332 = errors;
if(typeof data130.completeRepositoryCheck !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/properties/operationScope/properties/completeRepositoryCheck/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid43 = _errs332 === errors;
}
else {
var valid43 = true;
}
}
}
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/operationScope",schemaPath:"#/properties/operationScope/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs311 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.root !== undefined){
let data145 = data.root;
const _errs334 = errors;
if(errors === _errs334){
if(typeof data145 === "string"){
if(func2(data145) < 1){
validate52.errors = [{instancePath:instancePath+"/root",schemaPath:"#/properties/root/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/root",schemaPath:"#/properties/root/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs334 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.inputKind !== undefined){
let data146 = data.inputKind;
const _errs336 = errors;
if(!((data146 === "physical") || (data146 === "stdin"))){
validate52.errors = [{instancePath:instancePath+"/inputKind",schemaPath:"#/properties/inputKind/enum",keyword:"enum",params:{allowedValues: schema19.properties.inputKind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs336 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.selectedSourceCount !== undefined){
const _errs337 = errors;
if(!(validate81(data.selectedSourceCount, {instancePath:instancePath+"/selectedSourceCount",parentData:data,parentDataProperty:"selectedSourceCount",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var valid0 = _errs337 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completedSourceCount !== undefined){
const _errs338 = errors;
if(!(validate75(data.completedSourceCount, {instancePath:instancePath+"/completedSourceCount",parentData:data,parentDataProperty:"completedSourceCount",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs338 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.policyObservationComplete !== undefined){
const _errs339 = errors;
if(typeof data.policyObservationComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/policyObservationComplete",schemaPath:"#/properties/policyObservationComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs339 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.inputComplete !== undefined){
const _errs341 = errors;
if(typeof data.inputComplete !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/inputComplete",schemaPath:"#/properties/inputComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs341 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.changed !== undefined){
const _errs343 = errors;
if(typeof data.changed !== "boolean"){
validate52.errors = [{instancePath:instancePath+"/changed",schemaPath:"#/properties/changed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs343 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.candidateSha256 !== undefined){
let data152 = data.candidateSha256;
const _errs345 = errors;
if(errors === _errs345){
if(typeof data152 === "string"){
if(!pattern12.test(data152)){
validate52.errors = [{instancePath:instancePath+"/candidateSha256",schemaPath:"#/properties/candidateSha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/candidateSha256",schemaPath:"#/properties/candidateSha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs345 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.candidateByteLength !== undefined){
const _errs347 = errors;
if(!(validate75(data.candidateByteLength, {instancePath:instancePath+"/candidateByteLength",parentData:data,parentDataProperty:"candidateByteLength",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs347 === errors;
}
else {
var valid0 = true;
}
if(valid0){
const tag0 = data.type;
if(typeof tag0 == "string"){
if(tag0 === "source"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing11;
if((data.source === undefined) && (missing11 = "source")){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: missing11},message:"must have required property '"+missing11+"'"}];
return false;
}
else {
const _errs349 = errors;
for(const key11 in data){
if(!(func1.call(schema19.oneOf[0].properties, key11))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key11},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs349 === errors){
if(data.sha256 !== undefined){
let data154 = data.sha256;
const _errs350 = errors;
if(errors === _errs350){
if(typeof data154 === "string"){
if(!pattern12.test(data154)){
validate52.errors = [{instancePath:instancePath+"/sha256",schemaPath:"#/oneOf/0/properties/sha256/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/sha256",schemaPath:"#/oneOf/0/properties/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid46 = _errs350 === errors;
}
else {
var valid46 = true;
}
if(valid46){
if(data.type !== undefined){
const _errs352 = errors;
if("source" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/0/properties/type/const",keyword:"const",params:{allowedValue: "source"},message:"must be equal to constant"}];
return false;
}
var valid46 = _errs352 === errors;
}
else {
var valid46 = true;
}
}
}
}
}
}
else if(tag0 === "value"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing12;
if(((((((((((((data.source === undefined) && (missing12 = "source")) || ((data.reference === undefined) && (missing12 = "reference"))) || ((data.parent === undefined) && (missing12 = "parent"))) || ((data.name === undefined) && (missing12 = "name"))) || ((data.ordinal === undefined) && (missing12 = "ordinal"))) || ((data.kind === undefined) && (missing12 = "kind"))) || ((data.byteLength === undefined) && (missing12 = "byteLength"))) || ((data.sha256 === undefined) && (missing12 = "sha256"))) || ((data.closed === undefined) && (missing12 = "closed"))) || ((data.rawByteLength === undefined) && (missing12 = "rawByteLength"))) || ((data.sourceByteOffset === undefined) && (missing12 = "sourceByteOffset"))) || ((data.nfcAvailable === undefined) && (missing12 = "nfcAvailable"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: missing12},message:"must have required property '"+missing12+"'"}];
return false;
}
else {
const _errs354 = errors;
for(const key12 in data){
if(!(func1.call(schema19.oneOf[1].properties, key12))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key12},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs354 === errors){
if(data.type !== undefined){
if("value" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/1/properties/type/const",keyword:"const",params:{allowedValue: "value"},message:"must be equal to constant"}];
return false;
}
}
}
}
}
}
else if(tag0 === "finding"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing13;
if((((((((((((data.source === undefined) && (missing13 = "source")) || ((data.value === undefined) && (missing13 = "value"))) || ((data.severity === undefined) && (missing13 = "severity"))) || ((data.phase === undefined) && (missing13 = "phase"))) || ((data.ruleId === undefined) && (missing13 = "ruleId"))) || ((data.messageId === undefined) && (missing13 = "messageId"))) || ((data.arguments === undefined) && (missing13 = "arguments"))) || ((data.line === undefined) && (missing13 = "line"))) || ((data.column === undefined) && (missing13 = "column"))) || ((data.endLine === undefined) && (missing13 = "endLine"))) || ((data.endColumn === undefined) && (missing13 = "endColumn"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: missing13},message:"must have required property '"+missing13+"'"}];
return false;
}
else {
const _errs357 = errors;
for(const key13 in data){
if(!(func1.call(schema19.oneOf[2].properties, key13))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key13},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs357 === errors){
if(data.type !== undefined){
if("finding" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/2/properties/type/const",keyword:"const",params:{allowedValue: "finding"},message:"must be equal to constant"}];
return false;
}
}
}
}
}
}
else if(tag0 === "terminal"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing14;
if((((((((((((((((((((data.source === undefined) && (missing14 = "source")) || ((data.parserComplete === undefined) && (missing14 = "parserComplete"))) || ((data.rulesComplete === undefined) && (missing14 = "rulesComplete"))) || ((data.semanticRulesApplicable === undefined) && (missing14 = "semanticRulesApplicable"))) || ((data.presentationSelected === undefined) && (missing14 = "presentationSelected"))) || ((data.presentationChecked === undefined) && (missing14 = "presentationChecked"))) || ((data.diagnosticsComplete === undefined) && (missing14 = "diagnosticsComplete"))) || ((data.domainAdmission === undefined) && (missing14 = "domainAdmission"))) || ((data.qualityPassed === undefined) && (missing14 = "qualityPassed"))) || ((data.expectedMatched === undefined) && (missing14 = "expectedMatched"))) || ((data.contractSatisfied === undefined) && (missing14 = "contractSatisfied"))) || ((data.findingCount === undefined) && (missing14 = "findingCount"))) || ((data.diagnosticSha256 === undefined) && (missing14 = "diagnosticSha256"))) || ((data.sourceSha256 === undefined) && (missing14 = "sourceSha256"))) || ((data.managedPeakBytes === undefined) && (missing14 = "managedPeakBytes"))) || ((data.spillTransitionCount === undefined) && (missing14 = "spillTransitionCount"))) || ((data.scratchPeakBytes === undefined) && (missing14 = "scratchPeakBytes"))) || ((data.formatEligible === undefined) && (missing14 = "formatEligible"))) || ((data.normalizeEligible === undefined) && (missing14 = "normalizeEligible"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: missing14},message:"must have required property '"+missing14+"'"}];
return false;
}
else {
const _errs360 = errors;
for(const key14 in data){
if(!(func1.call(schema19.oneOf[3].properties, key14))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key14},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs360 === errors){
if(data.type !== undefined){
if("terminal" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/3/properties/type/const",keyword:"const",params:{allowedValue: "terminal"},message:"must be equal to constant"}];
return false;
}
}
}
}
}
}
else if(tag0 === "execution"){
const _errs362 = errors;
const _errs364 = errors;
let valid55 = true;
const _errs365 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.configurationOrigin !== undefined){
let data159 = data.configurationOrigin;
const _errs366 = errors;
if(errors === _errs366){
if(data159 && typeof data159 == "object" && !Array.isArray(data159)){
if(data159.kind !== undefined){
let data160 = data159.kind;
if(!((data160 === "repository-file") || (data160 === "git-blob"))){
const err97 = {};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
}
}
else {
const err98 = {};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
}
}
}
var _valid29 = _errs365 === errors;
errors = _errs364;
if(vErrors !== null){
if(_errs364){
vErrors.length = _errs364;
}
else {
vErrors = null;
}
}
let ifClause0;
if(_valid29){
const _errs369 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing15;
if(((data.configurationBytesSha256 === undefined) && (missing15 = "configurationBytesSha256")) || ((data.configurationByteLength === undefined) && (missing15 = "configurationByteLength"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/4/allOf/0/then/required",keyword:"required",params:{missingProperty: missing15},message:"must have required property '"+missing15+"'"}];
return false;
}
}
var _valid29 = _errs369 === errors;
valid55 = _valid29;
if(valid55){
var props5 = {};
props5.configurationBytesSha256 = true;
props5.configurationByteLength = true;
props5.configurationOrigin = true;
}
ifClause0 = "then";
}
else {
const _errs370 = errors;
const _errs371 = errors;
const _errs372 = errors;
const _errs373 = errors;
let valid59 = false;
const _errs374 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing16;
if((data.configurationBytesSha256 === undefined) && (missing16 = "configurationBytesSha256")){
const err99 = {};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
}
var _valid30 = _errs374 === errors;
valid59 = valid59 || _valid30;
const _errs375 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing17;
if((data.configurationByteLength === undefined) && (missing17 = "configurationByteLength")){
const err100 = {};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
}
var _valid30 = _errs375 === errors;
valid59 = valid59 || _valid30;
if(!valid59){
const err101 = {};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
else {
errors = _errs373;
if(vErrors !== null){
if(_errs373){
vErrors.length = _errs373;
}
else {
vErrors = null;
}
}
}
var valid58 = _errs372 === errors;
if(valid58){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/4/allOf/0/else/not",keyword:"not",params:{},message:"must NOT be valid"}];
return false;
}
else {
errors = _errs371;
if(vErrors !== null){
if(_errs371){
vErrors.length = _errs371;
}
else {
vErrors = null;
}
}
}
var _valid29 = _errs370 === errors;
valid55 = _valid29;
ifClause0 = "else";
}
if(!valid55){
const err102 = {instancePath,schemaPath:"#/oneOf/4/allOf/0/if",keyword:"if",params:{failingKeyword: ifClause0},message:"must match \""+ifClause0+"\" schema"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
validate52.errors = vErrors;
return false;
}
if(errors === _errs362){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing18;
if(((((((data.resources === undefined) && (missing18 = "resources")) || ((data.coreSourceInputsSha256 === undefined) && (missing18 = "coreSourceInputsSha256"))) || ((data.configurationOrigin === undefined) && (missing18 = "configurationOrigin"))) || ((data.defaultPolicySha256 === undefined) && (missing18 = "defaultPolicySha256"))) || ((data.policyResolverInputsSha256 === undefined) && (missing18 = "policyResolverInputsSha256"))) || ((data.policyInputsSha256 === undefined) && (missing18 = "policyInputsSha256"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: missing18},message:"must have required property '"+missing18+"'"}];
return false;
}
else {
const _errs376 = errors;
for(const key15 in data){
if(!(func1.call(schema19.oneOf[4].properties, key15))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/4/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key15},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs376 === errors){
if(data.type !== undefined){
if("execution" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/4/properties/type/const",keyword:"const",params:{allowedValue: "execution"},message:"must be equal to constant"}];
return false;
}
}
}
}
}
}
}
else if(tag0 === "execution-terminal"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing19;
if(((((((((data.inventoryComplete === undefined) && (missing19 = "inventoryComplete")) || ((data.linkedExpectationsComplete === undefined) && (missing19 = "linkedExpectationsComplete"))) || ((data.sourceObservationsComplete === undefined) && (missing19 = "sourceObservationsComplete"))) || ((data.diagnosticsComplete === undefined) && (missing19 = "diagnosticsComplete"))) || ((data.domainComplete === undefined) && (missing19 = "domainComplete"))) || ((data.inventoryMemberCount === undefined) && (missing19 = "inventoryMemberCount"))) || ((data.qualityPassed === undefined) && (missing19 = "qualityPassed"))) || ((data.contractSatisfied === undefined) && (missing19 = "contractSatisfied"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: missing19},message:"must have required property '"+missing19+"'"}];
return false;
}
else {
const _errs379 = errors;
for(const key16 in data){
if(!(func1.call(schema19.oneOf[5].properties, key16))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/5/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key16},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs379 === errors){
if(data.inventoryComplete !== undefined){
const _errs380 = errors;
if(true !== data.inventoryComplete){
validate52.errors = [{instancePath:instancePath+"/inventoryComplete",schemaPath:"#/oneOf/5/properties/inventoryComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid62 = _errs380 === errors;
}
else {
var valid62 = true;
}
if(valid62){
if(data.linkedExpectationsComplete !== undefined){
const _errs381 = errors;
if(true !== data.linkedExpectationsComplete){
validate52.errors = [{instancePath:instancePath+"/linkedExpectationsComplete",schemaPath:"#/oneOf/5/properties/linkedExpectationsComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid62 = _errs381 === errors;
}
else {
var valid62 = true;
}
if(valid62){
if(data.sourceObservationsComplete !== undefined){
const _errs382 = errors;
if(true !== data.sourceObservationsComplete){
validate52.errors = [{instancePath:instancePath+"/sourceObservationsComplete",schemaPath:"#/oneOf/5/properties/sourceObservationsComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid62 = _errs382 === errors;
}
else {
var valid62 = true;
}
if(valid62){
if(data.diagnosticsComplete !== undefined){
const _errs383 = errors;
if(true !== data.diagnosticsComplete){
validate52.errors = [{instancePath:instancePath+"/diagnosticsComplete",schemaPath:"#/oneOf/5/properties/diagnosticsComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid62 = _errs383 === errors;
}
else {
var valid62 = true;
}
if(valid62){
if(data.type !== undefined){
const _errs384 = errors;
if("execution-terminal" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/5/properties/type/const",keyword:"const",params:{allowedValue: "execution-terminal"},message:"must be equal to constant"}];
return false;
}
var valid62 = _errs384 === errors;
}
else {
var valid62 = true;
}
}
}
}
}
}
}
}
}
else if(tag0 === "failure"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing20;
if((((data.code === undefined) && (missing20 = "code")) || ((data.message === undefined) && (missing20 = "message"))) || ((data.truncated === undefined) && (missing20 = "truncated"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: missing20},message:"must have required property '"+missing20+"'"}];
return false;
}
else {
const _errs386 = errors;
for(const key17 in data){
if(!(((((((key17 === "schemaVersion") || (key17 === "requestId")) || (key17 === "code")) || (key17 === "message")) || (key17 === "truncated")) || (key17 === "type")) || (key17 === "operationScope"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/6/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key17},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs386 === errors){
if(data.type !== undefined){
if("failure" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/6/properties/type/const",keyword:"const",params:{allowedValue: "failure"},message:"must be equal to constant"}];
return false;
}
}
}
}
}
}
else if(tag0 === "write-preflight"){
const _errs388 = errors;
if(errors === _errs388){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing21;
if((((((((data.schemaVersion === undefined) && (missing21 = "schemaVersion")) || ((data.requestId === undefined) && (missing21 = "requestId"))) || ((data.type === undefined) && (missing21 = "type"))) || ((data.operation === undefined) && (missing21 = "operation"))) || ((data.selectedPathCount === undefined) && (missing21 = "selectedPathCount"))) || ((data.changedPathCount === undefined) && (missing21 = "changedPathCount"))) || ((data.preflightComplete === undefined) && (missing21 = "preflightComplete"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: missing21},message:"must have required property '"+missing21+"'"}];
return false;
}
else {
const _errs390 = errors;
for(const key18 in data){
if(!((((((((key18 === "schemaVersion") || (key18 === "requestId")) || (key18 === "type")) || (key18 === "operation")) || (key18 === "selectedPathCount")) || (key18 === "changedPathCount")) || (key18 === "preflightComplete")) || (key18 === "operationScope"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/7/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key18},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs390 === errors){
if(data.type !== undefined){
const _errs391 = errors;
if("write-preflight" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/7/properties/type/const",keyword:"const",params:{allowedValue: "write-preflight"},message:"must be equal to constant"}];
return false;
}
var valid66 = _errs391 === errors;
}
else {
var valid66 = true;
}
if(valid66){
if(data.preflightComplete !== undefined){
const _errs392 = errors;
if(true !== data.preflightComplete){
validate52.errors = [{instancePath:instancePath+"/preflightComplete",schemaPath:"#/oneOf/7/properties/preflightComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid66 = _errs392 === errors;
}
else {
var valid66 = true;
}
}
}
}
}
else {
validate52.errors = [{instancePath,schemaPath:"#/oneOf/7/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
}
else if(tag0 === "written"){
const _errs393 = errors;
if(errors === _errs393){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing22;
if((((((((data.schemaVersion === undefined) && (missing22 = "schemaVersion")) || ((data.requestId === undefined) && (missing22 = "requestId"))) || ((data.type === undefined) && (missing22 = "type"))) || ((data.operation === undefined) && (missing22 = "operation"))) || ((data.path === undefined) && (missing22 = "path"))) || ((data.byteLength === undefined) && (missing22 = "byteLength"))) || ((data.sha256 === undefined) && (missing22 = "sha256"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/8/required",keyword:"required",params:{missingProperty: missing22},message:"must have required property '"+missing22+"'"}];
return false;
}
else {
const _errs395 = errors;
for(const key19 in data){
if(!((((((((key19 === "schemaVersion") || (key19 === "requestId")) || (key19 === "type")) || (key19 === "operation")) || (key19 === "path")) || (key19 === "byteLength")) || (key19 === "sha256")) || (key19 === "operationScope"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/8/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key19},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs395 === errors){
if(data.type !== undefined){
if("written" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/8/properties/type/const",keyword:"const",params:{allowedValue: "written"},message:"must be equal to constant"}];
return false;
}
}
}
}
}
else {
validate52.errors = [{instancePath,schemaPath:"#/oneOf/8/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
}
else if(tag0 === "write-terminal"){
const _errs397 = errors;
if(errors === _errs397){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing23;
if((((((((((((((data.schemaVersion === undefined) && (missing23 = "schemaVersion")) || ((data.requestId === undefined) && (missing23 = "requestId"))) || ((data.type === undefined) && (missing23 = "type"))) || ((data.operation === undefined) && (missing23 = "operation"))) || ((data.selectedPathCount === undefined) && (missing23 = "selectedPathCount"))) || ((data.changedPathCount === undefined) && (missing23 = "changedPathCount"))) || ((data.writtenPathCount === undefined) && (missing23 = "writtenPathCount"))) || ((data.complete === undefined) && (missing23 = "complete"))) || ((data.writesComplete === undefined) && (missing23 = "writesComplete"))) || ((data.preflightComplete === undefined) && (missing23 = "preflightComplete"))) || ((data.sourceObservationsComplete === undefined) && (missing23 = "sourceObservationsComplete"))) || ((data.qualityPassed === undefined) && (missing23 = "qualityPassed"))) || ((data.findingCount === undefined) && (missing23 = "findingCount"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/9/required",keyword:"required",params:{missingProperty: missing23},message:"must have required property '"+missing23+"'"}];
return false;
}
else {
const _errs399 = errors;
for(const key20 in data){
if(!(func1.call(schema19.oneOf[9].properties, key20))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/9/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key20},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs399 === errors){
if(data.type !== undefined){
const _errs400 = errors;
if("write-terminal" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/9/properties/type/const",keyword:"const",params:{allowedValue: "write-terminal"},message:"must be equal to constant"}];
return false;
}
var valid70 = _errs400 === errors;
}
else {
var valid70 = true;
}
if(valid70){
if(data.complete !== undefined){
const _errs401 = errors;
if(true !== data.complete){
validate52.errors = [{instancePath:instancePath+"/complete",schemaPath:"#/oneOf/9/properties/complete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid70 = _errs401 === errors;
}
else {
var valid70 = true;
}
if(valid70){
if(data.writesComplete !== undefined){
const _errs402 = errors;
if(true !== data.writesComplete){
validate52.errors = [{instancePath:instancePath+"/writesComplete",schemaPath:"#/oneOf/9/properties/writesComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid70 = _errs402 === errors;
}
else {
var valid70 = true;
}
if(valid70){
if(data.preflightComplete !== undefined){
const _errs403 = errors;
if(true !== data.preflightComplete){
validate52.errors = [{instancePath:instancePath+"/preflightComplete",schemaPath:"#/oneOf/9/properties/preflightComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid70 = _errs403 === errors;
}
else {
var valid70 = true;
}
if(valid70){
if(data.sourceObservationsComplete !== undefined){
const _errs404 = errors;
if(true !== data.sourceObservationsComplete){
validate52.errors = [{instancePath:instancePath+"/sourceObservationsComplete",schemaPath:"#/oneOf/9/properties/sourceObservationsComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid70 = _errs404 === errors;
}
else {
var valid70 = true;
}
}
}
}
}
}
}
}
else {
validate52.errors = [{instancePath,schemaPath:"#/oneOf/9/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
}
else if(tag0 === "write-failure"){
const _errs405 = errors;
const _errs407 = errors;
let valid72 = true;
const _errs408 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.message !== undefined){
if(!(validate145(data.message, {instancePath:instancePath+"/message",parentData:data,parentDataProperty:"message",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate145.errors : vErrors.concat(validate145.errors);
errors = vErrors.length;
}
}
}
var _valid31 = _errs408 === errors;
errors = _errs407;
if(vErrors !== null){
if(_errs407){
vErrors.length = _errs407;
}
else {
vErrors = null;
}
}
if(_valid31){
const _errs410 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.preflightComplete !== undefined){
const _errs411 = errors;
if(false !== data.preflightComplete){
validate52.errors = [{instancePath:instancePath+"/preflightComplete",schemaPath:"#/oneOf/10/then/properties/preflightComplete/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"}];
return false;
}
var valid74 = _errs411 === errors;
}
else {
var valid74 = true;
}
if(valid74){
if(data.writtenPathCount !== undefined){
const _errs412 = errors;
if("0" !== data.writtenPathCount){
validate52.errors = [{instancePath:instancePath+"/writtenPathCount",schemaPath:"#/oneOf/10/then/properties/writtenPathCount/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"}];
return false;
}
var valid74 = _errs412 === errors;
}
else {
var valid74 = true;
}
if(valid74){
if(data.uncertainPath !== undefined){
const _errs413 = errors;
if(data.uncertainPath !== null){
validate52.errors = [{instancePath:instancePath+"/uncertainPath",schemaPath:"#/oneOf/10/then/properties/uncertainPath/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid74 = _errs413 === errors;
}
else {
var valid74 = true;
}
}
}
}
var _valid31 = _errs410 === errors;
valid72 = _valid31;
if(valid72){
var props6 = {};
props6.preflightComplete = true;
props6.writtenPathCount = true;
props6.uncertainPath = true;
props6.message = true;
}
}
if(!valid72){
const err103 = {instancePath,schemaPath:"#/oneOf/10/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
validate52.errors = vErrors;
return false;
}
if(errors === _errs405){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing24;
if((((((((((data.schemaVersion === undefined) && (missing24 = "schemaVersion")) || ((data.requestId === undefined) && (missing24 = "requestId"))) || ((data.type === undefined) && (missing24 = "type"))) || ((data.operation === undefined) && (missing24 = "operation"))) || ((data.complete === undefined) && (missing24 = "complete"))) || ((data.preflightComplete === undefined) && (missing24 = "preflightComplete"))) || ((data.writtenPathCount === undefined) && (missing24 = "writtenPathCount"))) || ((data.uncertainPath === undefined) && (missing24 = "uncertainPath"))) || ((data.message === undefined) && (missing24 = "message"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/10/required",keyword:"required",params:{missingProperty: missing24},message:"must have required property '"+missing24+"'"}];
return false;
}
else {
const _errs415 = errors;
for(const key21 in data){
if(!(func1.call(schema19.oneOf[10].properties, key21))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/10/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key21},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs415 === errors){
if(data.type !== undefined){
const _errs416 = errors;
if("write-failure" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/10/properties/type/const",keyword:"const",params:{allowedValue: "write-failure"},message:"must be equal to constant"}];
return false;
}
var valid75 = _errs416 === errors;
}
else {
var valid75 = true;
}
if(valid75){
if(data.complete !== undefined){
const _errs417 = errors;
if(false !== data.complete){
validate52.errors = [{instancePath:instancePath+"/complete",schemaPath:"#/oneOf/10/properties/complete/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"}];
return false;
}
var valid75 = _errs417 === errors;
}
else {
var valid75 = true;
}
}
}
}
}
else {
validate52.errors = [{instancePath,schemaPath:"#/oneOf/10/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
}
else if(tag0 === "nfc-key-collision-risk"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing25;
if(((((((((((((((((data.schemaVersion === undefined) && (missing25 = "schemaVersion")) || ((data.requestId === undefined) && (missing25 = "requestId"))) || ((data.source === undefined) && (missing25 = "source"))) || ((data.containerValue === undefined) && (missing25 = "containerValue"))) || ((data.value === undefined) && (missing25 = "value"))) || ((data.priorValue === undefined) && (missing25 = "priorValue"))) || ((data.line === undefined) && (missing25 = "line"))) || ((data.column === undefined) && (missing25 = "column"))) || ((data.endLine === undefined) && (missing25 = "endLine"))) || ((data.endColumn === undefined) && (missing25 = "endColumn"))) || ((data.priorLine === undefined) && (missing25 = "priorLine"))) || ((data.priorColumn === undefined) && (missing25 = "priorColumn"))) || ((data.priorEndLine === undefined) && (missing25 = "priorEndLine"))) || ((data.priorEndColumn === undefined) && (missing25 = "priorEndColumn"))) || ((data.normalizedSha256 === undefined) && (missing25 = "normalizedSha256"))) || ((data.normalizedByteLength === undefined) && (missing25 = "normalizedByteLength"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/11/required",keyword:"required",params:{missingProperty: missing25},message:"must have required property '"+missing25+"'"}];
return false;
}
else {
const _errs419 = errors;
for(const key22 in data){
if(!(func1.call(schema19.oneOf[11].properties, key22))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/11/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key22},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs419 === errors){
if(data.type !== undefined){
if("nfc-key-collision-risk" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/11/properties/type/const",keyword:"const",params:{allowedValue: "nfc-key-collision-risk"},message:"must be equal to constant"}];
return false;
}
}
}
}
}
}
else if(tag0 === "normalization-preview-change"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing26;
if((((((((((((((((((data.schemaVersion === undefined) && (missing26 = "schemaVersion")) || ((data.requestId === undefined) && (missing26 = "requestId"))) || ((data.operation === undefined) && (missing26 = "operation"))) || ((data.path === undefined) && (missing26 = "path"))) || ((data.sourceSha256 === undefined) && (missing26 = "sourceSha256"))) || ((data.sourceByteLength === undefined) && (missing26 = "sourceByteLength"))) || ((data.sourceByteOffset === undefined) && (missing26 = "sourceByteOffset"))) || ((data.rawByteLength === undefined) && (missing26 = "rawByteLength"))) || ((data.pointer === undefined) && (missing26 = "pointer"))) || ((data.valueKind === undefined) && (missing26 = "valueKind"))) || ((data.normalizedSha256 === undefined) && (missing26 = "normalizedSha256"))) || ((data.normalizedByteLength === undefined) && (missing26 = "normalizedByteLength"))) || ((data.coreSourceInputsSha256 === undefined) && (missing26 = "coreSourceInputsSha256"))) || ((data.icuVersion === undefined) && (missing26 = "icuVersion"))) || ((data.unicodeVersion === undefined) && (missing26 = "unicodeVersion"))) || ((data.decodedByteLength === undefined) && (missing26 = "decodedByteLength"))) || ((data.decodedSha256 === undefined) && (missing26 = "decodedSha256"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/12/required",keyword:"required",params:{missingProperty: missing26},message:"must have required property '"+missing26+"'"}];
return false;
}
else {
const _errs422 = errors;
for(const key23 in data){
if(!(func1.call(schema19.oneOf[12].properties, key23))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/12/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key23},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs422 === errors){
if(data.type !== undefined){
if("normalization-preview-change" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/12/properties/type/const",keyword:"const",params:{allowedValue: "normalization-preview-change"},message:"must be equal to constant"}];
return false;
}
}
}
}
}
}
else if(tag0 === "normalization-preview-terminal"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing27;
if((((((((((data.schemaVersion === undefined) && (missing27 = "schemaVersion")) || ((data.requestId === undefined) && (missing27 = "requestId"))) || ((data.operation === undefined) && (missing27 = "operation"))) || ((data.complete === undefined) && (missing27 = "complete"))) || ((data.preflightComplete === undefined) && (missing27 = "preflightComplete"))) || ((data.sourceObservationsComplete === undefined) && (missing27 = "sourceObservationsComplete"))) || ((data.coreSourceInputsSha256 === undefined) && (missing27 = "coreSourceInputsSha256"))) || ((data.icuVersion === undefined) && (missing27 = "icuVersion"))) || ((data.unicodeVersion === undefined) && (missing27 = "unicodeVersion"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/13/required",keyword:"required",params:{missingProperty: missing27},message:"must have required property '"+missing27+"'"}];
return false;
}
else {
const _errs425 = errors;
for(const key24 in data){
if(!(func1.call(schema19.oneOf[13].properties, key24))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/13/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key24},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs425 === errors){
if(data.type !== undefined){
if("normalization-preview-terminal" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/13/properties/type/const",keyword:"const",params:{allowedValue: "normalization-preview-terminal"},message:"must be equal to constant"}];
return false;
}
}
}
}
}
}
else if(tag0 === "selection"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing28;
if((((((((((((((data.schemaVersion === undefined) && (missing28 = "schemaVersion")) || ((data.requestId === undefined) && (missing28 = "requestId"))) || ((data.type === undefined) && (missing28 = "type"))) || ((data.operationScope === undefined) && (missing28 = "operationScope"))) || ((data.root === undefined) && (missing28 = "root"))) || ((data.inputKind === undefined) && (missing28 = "inputKind"))) || ((data.selectedSourceCount === undefined) && (missing28 = "selectedSourceCount"))) || ((data.resources === undefined) && (missing28 = "resources"))) || ((data.configurationOrigin === undefined) && (missing28 = "configurationOrigin"))) || ((data.defaultPolicySha256 === undefined) && (missing28 = "defaultPolicySha256"))) || ((data.policyResolverInputsSha256 === undefined) && (missing28 = "policyResolverInputsSha256"))) || ((data.policyInputsSha256 === undefined) && (missing28 = "policyInputsSha256"))) || ((data.coreSourceInputsSha256 === undefined) && (missing28 = "coreSourceInputsSha256"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/14/required",keyword:"required",params:{missingProperty: missing28},message:"must have required property '"+missing28+"'"}];
return false;
}
else {
const _errs428 = errors;
for(const key25 in data){
if(!(func1.call(schema19.oneOf[14].properties, key25))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/14/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key25},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs428 === errors){
if(data.operationScope !== undefined){
let data185 = data.operationScope;
const _errs429 = errors;
const _errs431 = errors;
let valid84 = false;
let passing2 = null;
const _errs432 = errors;
if(data185 && typeof data185 == "object" && !Array.isArray(data185)){
if(data185.kind !== undefined){
const _errs433 = errors;
if("repository" !== data185.kind){
const err104 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/0/properties/kind/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
var valid85 = _errs433 === errors;
}
else {
var valid85 = true;
}
if(valid85){
if(data185.policy !== undefined){
const _errs434 = errors;
if("repository" !== data185.policy){
const err105 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/0/properties/policy/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
var valid85 = _errs434 === errors;
}
else {
var valid85 = true;
}
}
}
var _valid32 = _errs432 === errors;
if(_valid32){
valid84 = true;
passing2 = 0;
var props7 = {};
props7.kind = true;
props7.policy = true;
}
const _errs435 = errors;
if(data185 && typeof data185 == "object" && !Array.isArray(data185)){
if(data185.kind !== undefined){
const _errs436 = errors;
if("selected-files" !== data185.kind){
const err106 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "selected-files"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
var valid86 = _errs436 === errors;
}
else {
var valid86 = true;
}
if(valid86){
if(data185.policy !== undefined){
const _errs437 = errors;
if("repository" !== data185.policy){
const err107 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/1/properties/policy/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
var valid86 = _errs437 === errors;
}
else {
var valid86 = true;
}
if(valid86){
if(data185.completeRepositoryCheck !== undefined){
const _errs438 = errors;
if(false !== data185.completeRepositoryCheck){
const err108 = {instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/1/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err108];
}
else {
vErrors.push(err108);
}
errors++;
}
var valid86 = _errs438 === errors;
}
else {
var valid86 = true;
}
}
}
}
var _valid32 = _errs435 === errors;
if(_valid32 && valid84){
valid84 = false;
passing2 = [passing2, 1];
}
else {
if(_valid32){
valid84 = true;
passing2 = 1;
if(props7 !== true){
props7 = props7 || {};
props7.kind = true;
props7.policy = true;
props7.completeRepositoryCheck = true;
}
}
const _errs439 = errors;
if(data185 && typeof data185 == "object" && !Array.isArray(data185)){
if(data185.kind !== undefined){
const _errs440 = errors;
if("stdin" !== data185.kind){
const err109 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "stdin"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err109];
}
else {
vErrors.push(err109);
}
errors++;
}
var valid87 = _errs440 === errors;
}
else {
var valid87 = true;
}
if(valid87){
if(data185.policy !== undefined){
let data192 = data185.policy;
const _errs441 = errors;
if(!((data192 === "repository") || (data192 === "explicit-contract"))){
const err110 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/2/properties/policy/enum",keyword:"enum",params:{allowedValues: schema19.oneOf[14].properties.operationScope.oneOf[2].properties.policy.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err110];
}
else {
vErrors.push(err110);
}
errors++;
}
var valid87 = _errs441 === errors;
}
else {
var valid87 = true;
}
if(valid87){
if(data185.completeRepositoryCheck !== undefined){
const _errs442 = errors;
if(false !== data185.completeRepositoryCheck){
const err111 = {instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/2/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err111];
}
else {
vErrors.push(err111);
}
errors++;
}
var valid87 = _errs442 === errors;
}
else {
var valid87 = true;
}
}
}
}
var _valid32 = _errs439 === errors;
if(_valid32 && valid84){
valid84 = false;
passing2 = [passing2, 2];
}
else {
if(_valid32){
valid84 = true;
passing2 = 2;
if(props7 !== true){
props7 = props7 || {};
props7.kind = true;
props7.policy = true;
props7.completeRepositoryCheck = true;
}
}
const _errs443 = errors;
if(data185 && typeof data185 == "object" && !Array.isArray(data185)){
if(data185.kind !== undefined){
const _errs444 = errors;
if("immutable-git-json" !== data185.kind){
const err112 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "immutable-git-json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err112];
}
else {
vErrors.push(err112);
}
errors++;
}
var valid88 = _errs444 === errors;
}
else {
var valid88 = true;
}
if(valid88){
if(data185.policy !== undefined){
const _errs445 = errors;
if("trusted-git" !== data185.policy){
const err113 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/3/properties/policy/const",keyword:"const",params:{allowedValue: "trusted-git"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err113];
}
else {
vErrors.push(err113);
}
errors++;
}
var valid88 = _errs445 === errors;
}
else {
var valid88 = true;
}
if(valid88){
if(data185.completeRepositoryCheck !== undefined){
const _errs446 = errors;
if(false !== data185.completeRepositoryCheck){
const err114 = {instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/oneOf/14/properties/operationScope/oneOf/3/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err114];
}
else {
vErrors.push(err114);
}
errors++;
}
var valid88 = _errs446 === errors;
}
else {
var valid88 = true;
}
}
}
}
var _valid32 = _errs443 === errors;
if(_valid32 && valid84){
valid84 = false;
passing2 = [passing2, 3];
}
else {
if(_valid32){
valid84 = true;
passing2 = 3;
if(props7 !== true){
props7 = props7 || {};
props7.kind = true;
props7.policy = true;
props7.completeRepositoryCheck = true;
}
}
}
}
}
if(!valid84){
const err115 = {instancePath:instancePath+"/operationScope",schemaPath:"#/oneOf/14/properties/operationScope/oneOf",keyword:"oneOf",params:{passingSchemas: passing2},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err115];
}
else {
vErrors.push(err115);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs431;
if(vErrors !== null){
if(_errs431){
vErrors.length = _errs431;
}
else {
vErrors = null;
}
}
}
if(errors === _errs429){
if(data185 && typeof data185 == "object" && !Array.isArray(data185)){
let missing29;
if((((data185.kind === undefined) && (missing29 = "kind")) || ((data185.policy === undefined) && (missing29 = "policy"))) || ((data185.completeRepositoryCheck === undefined) && (missing29 = "completeRepositoryCheck"))){
validate52.errors = [{instancePath:instancePath+"/operationScope",schemaPath:"#/oneOf/14/properties/operationScope/required",keyword:"required",params:{missingProperty: missing29},message:"must have required property '"+missing29+"'"}];
return false;
}
else {
const _errs447 = errors;
for(const key26 in data185){
if(!(((key26 === "kind") || (key26 === "policy")) || (key26 === "completeRepositoryCheck"))){
validate52.errors = [{instancePath:instancePath+"/operationScope",schemaPath:"#/oneOf/14/properties/operationScope/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key26},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs447 === errors){
if(data185.kind !== undefined){
let data197 = data185.kind;
const _errs448 = errors;
if(!((data197 === "selected-files") || (data197 === "stdin"))){
validate52.errors = [{instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/14/properties/operationScope/properties/kind/enum",keyword:"enum",params:{allowedValues: schema19.oneOf[14].properties.operationScope.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid89 = _errs448 === errors;
}
else {
var valid89 = true;
}
if(valid89){
if(data185.policy !== undefined){
const _errs449 = errors;
if("repository" !== data185.policy){
validate52.errors = [{instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/14/properties/operationScope/properties/policy/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"}];
return false;
}
var valid89 = _errs449 === errors;
}
else {
var valid89 = true;
}
if(valid89){
if(data185.completeRepositoryCheck !== undefined){
const _errs450 = errors;
if(false !== data185.completeRepositoryCheck){
validate52.errors = [{instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/oneOf/14/properties/operationScope/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"}];
return false;
}
var valid89 = _errs450 === errors;
}
else {
var valid89 = true;
}
}
}
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/operationScope",schemaPath:"#/oneOf/14/properties/operationScope/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid83 = _errs429 === errors;
}
else {
var valid83 = true;
}
if(valid83){
if(data.type !== undefined){
const _errs451 = errors;
if("selection" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/14/properties/type/const",keyword:"const",params:{allowedValue: "selection"},message:"must be equal to constant"}];
return false;
}
var valid83 = _errs451 === errors;
}
else {
var valid83 = true;
}
}
}
}
}
}
else if(tag0 === "selection-terminal"){
const _errs452 = errors;
const _errs454 = errors;
let valid92 = true;
const _errs455 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.inputKind !== undefined){
if("physical" !== data.inputKind){
const err116 = {};
if(vErrors === null){
vErrors = [err116];
}
else {
vErrors.push(err116);
}
errors++;
}
}
}
var _valid33 = _errs455 === errors;
errors = _errs454;
if(vErrors !== null){
if(_errs454){
vErrors.length = _errs454;
}
else {
vErrors = null;
}
}
let ifClause1;
if(_valid33){
const _errs457 = errors;
const _errs458 = errors;
const _errs459 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing30;
if((data.inputComplete === undefined) && (missing30 = "inputComplete")){
const err117 = {};
if(vErrors === null){
vErrors = [err117];
}
else {
vErrors.push(err117);
}
errors++;
}
}
var valid94 = _errs459 === errors;
if(valid94){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/15/allOf/0/then/not",keyword:"not",params:{},message:"must NOT be valid"}];
return false;
}
else {
errors = _errs458;
if(vErrors !== null){
if(_errs458){
vErrors.length = _errs458;
}
else {
vErrors = null;
}
}
}
if(errors === _errs457){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing31;
if((data.sourceObservationsComplete === undefined) && (missing31 = "sourceObservationsComplete")){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/15/allOf/0/then/required",keyword:"required",params:{missingProperty: missing31},message:"must have required property '"+missing31+"'"}];
return false;
}
else {
if(data.sourceObservationsComplete !== undefined){
if(true !== data.sourceObservationsComplete){
validate52.errors = [{instancePath:instancePath+"/sourceObservationsComplete",schemaPath:"#/oneOf/15/allOf/0/then/properties/sourceObservationsComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
}
}
}
}
var _valid33 = _errs457 === errors;
valid92 = _valid33;
if(valid92){
var props8 = {};
props8.sourceObservationsComplete = true;
props8.inputKind = true;
}
ifClause1 = "then";
}
else {
const _errs461 = errors;
const _errs462 = errors;
const _errs463 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing32;
if((data.sourceObservationsComplete === undefined) && (missing32 = "sourceObservationsComplete")){
const err118 = {};
if(vErrors === null){
vErrors = [err118];
}
else {
vErrors.push(err118);
}
errors++;
}
}
var valid96 = _errs463 === errors;
if(valid96){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/15/allOf/0/else/not",keyword:"not",params:{},message:"must NOT be valid"}];
return false;
}
else {
errors = _errs462;
if(vErrors !== null){
if(_errs462){
vErrors.length = _errs462;
}
else {
vErrors = null;
}
}
}
if(errors === _errs461){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing33;
if((data.inputComplete === undefined) && (missing33 = "inputComplete")){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/15/allOf/0/else/required",keyword:"required",params:{missingProperty: missing33},message:"must have required property '"+missing33+"'"}];
return false;
}
else {
if(data.inputComplete !== undefined){
if(true !== data.inputComplete){
validate52.errors = [{instancePath:instancePath+"/inputComplete",schemaPath:"#/oneOf/15/allOf/0/else/properties/inputComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
}
}
}
}
var _valid33 = _errs461 === errors;
valid92 = _valid33;
if(valid92){
if(props8 !== true){
props8 = props8 || {};
props8.inputComplete = true;
}
}
ifClause1 = "else";
}
if(!valid92){
const err119 = {instancePath,schemaPath:"#/oneOf/15/allOf/0/if",keyword:"if",params:{failingKeyword: ifClause1},message:"must match \""+ifClause1+"\" schema"};
if(vErrors === null){
vErrors = [err119];
}
else {
vErrors.push(err119);
}
errors++;
validate52.errors = vErrors;
return false;
}
if(errors === _errs452){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing34;
if(((((((((((((data.schemaVersion === undefined) && (missing34 = "schemaVersion")) || ((data.requestId === undefined) && (missing34 = "requestId"))) || ((data.type === undefined) && (missing34 = "type"))) || ((data.operationScope === undefined) && (missing34 = "operationScope"))) || ((data.inputKind === undefined) && (missing34 = "inputKind"))) || ((data.selectedSourceCount === undefined) && (missing34 = "selectedSourceCount"))) || ((data.completedSourceCount === undefined) && (missing34 = "completedSourceCount"))) || ((data.complete === undefined) && (missing34 = "complete"))) || ((data.diagnosticsComplete === undefined) && (missing34 = "diagnosticsComplete"))) || ((data.qualityPassed === undefined) && (missing34 = "qualityPassed"))) || ((data.contractSatisfied === undefined) && (missing34 = "contractSatisfied"))) || ((data.policyObservationComplete === undefined) && (missing34 = "policyObservationComplete"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/15/required",keyword:"required",params:{missingProperty: missing34},message:"must have required property '"+missing34+"'"}];
return false;
}
else {
const _errs465 = errors;
for(const key27 in data){
if(!(func1.call(schema19.oneOf[15].properties, key27))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/15/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key27},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs465 === errors){
if(data.operationScope !== undefined){
let data204 = data.operationScope;
const _errs466 = errors;
const _errs468 = errors;
let valid99 = false;
let passing3 = null;
const _errs469 = errors;
if(data204 && typeof data204 == "object" && !Array.isArray(data204)){
if(data204.kind !== undefined){
const _errs470 = errors;
if("repository" !== data204.kind){
const err120 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/0/properties/kind/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err120];
}
else {
vErrors.push(err120);
}
errors++;
}
var valid100 = _errs470 === errors;
}
else {
var valid100 = true;
}
if(valid100){
if(data204.policy !== undefined){
const _errs471 = errors;
if("repository" !== data204.policy){
const err121 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/0/properties/policy/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err121];
}
else {
vErrors.push(err121);
}
errors++;
}
var valid100 = _errs471 === errors;
}
else {
var valid100 = true;
}
}
}
var _valid34 = _errs469 === errors;
if(_valid34){
valid99 = true;
passing3 = 0;
var props9 = {};
props9.kind = true;
props9.policy = true;
}
const _errs472 = errors;
if(data204 && typeof data204 == "object" && !Array.isArray(data204)){
if(data204.kind !== undefined){
const _errs473 = errors;
if("selected-files" !== data204.kind){
const err122 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "selected-files"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err122];
}
else {
vErrors.push(err122);
}
errors++;
}
var valid101 = _errs473 === errors;
}
else {
var valid101 = true;
}
if(valid101){
if(data204.policy !== undefined){
const _errs474 = errors;
if("repository" !== data204.policy){
const err123 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/1/properties/policy/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err123];
}
else {
vErrors.push(err123);
}
errors++;
}
var valid101 = _errs474 === errors;
}
else {
var valid101 = true;
}
if(valid101){
if(data204.completeRepositoryCheck !== undefined){
const _errs475 = errors;
if(false !== data204.completeRepositoryCheck){
const err124 = {instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/1/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err124];
}
else {
vErrors.push(err124);
}
errors++;
}
var valid101 = _errs475 === errors;
}
else {
var valid101 = true;
}
}
}
}
var _valid34 = _errs472 === errors;
if(_valid34 && valid99){
valid99 = false;
passing3 = [passing3, 1];
}
else {
if(_valid34){
valid99 = true;
passing3 = 1;
if(props9 !== true){
props9 = props9 || {};
props9.kind = true;
props9.policy = true;
props9.completeRepositoryCheck = true;
}
}
const _errs476 = errors;
if(data204 && typeof data204 == "object" && !Array.isArray(data204)){
if(data204.kind !== undefined){
const _errs477 = errors;
if("stdin" !== data204.kind){
const err125 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "stdin"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err125];
}
else {
vErrors.push(err125);
}
errors++;
}
var valid102 = _errs477 === errors;
}
else {
var valid102 = true;
}
if(valid102){
if(data204.policy !== undefined){
let data211 = data204.policy;
const _errs478 = errors;
if(!((data211 === "repository") || (data211 === "explicit-contract"))){
const err126 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/2/properties/policy/enum",keyword:"enum",params:{allowedValues: schema19.oneOf[15].properties.operationScope.oneOf[2].properties.policy.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err126];
}
else {
vErrors.push(err126);
}
errors++;
}
var valid102 = _errs478 === errors;
}
else {
var valid102 = true;
}
if(valid102){
if(data204.completeRepositoryCheck !== undefined){
const _errs479 = errors;
if(false !== data204.completeRepositoryCheck){
const err127 = {instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/2/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err127];
}
else {
vErrors.push(err127);
}
errors++;
}
var valid102 = _errs479 === errors;
}
else {
var valid102 = true;
}
}
}
}
var _valid34 = _errs476 === errors;
if(_valid34 && valid99){
valid99 = false;
passing3 = [passing3, 2];
}
else {
if(_valid34){
valid99 = true;
passing3 = 2;
if(props9 !== true){
props9 = props9 || {};
props9.kind = true;
props9.policy = true;
props9.completeRepositoryCheck = true;
}
}
const _errs480 = errors;
if(data204 && typeof data204 == "object" && !Array.isArray(data204)){
if(data204.kind !== undefined){
const _errs481 = errors;
if("immutable-git-json" !== data204.kind){
const err128 = {instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "immutable-git-json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err128];
}
else {
vErrors.push(err128);
}
errors++;
}
var valid103 = _errs481 === errors;
}
else {
var valid103 = true;
}
if(valid103){
if(data204.policy !== undefined){
const _errs482 = errors;
if("trusted-git" !== data204.policy){
const err129 = {instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/3/properties/policy/const",keyword:"const",params:{allowedValue: "trusted-git"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err129];
}
else {
vErrors.push(err129);
}
errors++;
}
var valid103 = _errs482 === errors;
}
else {
var valid103 = true;
}
if(valid103){
if(data204.completeRepositoryCheck !== undefined){
const _errs483 = errors;
if(false !== data204.completeRepositoryCheck){
const err130 = {instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/oneOf/15/properties/operationScope/oneOf/3/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err130];
}
else {
vErrors.push(err130);
}
errors++;
}
var valid103 = _errs483 === errors;
}
else {
var valid103 = true;
}
}
}
}
var _valid34 = _errs480 === errors;
if(_valid34 && valid99){
valid99 = false;
passing3 = [passing3, 3];
}
else {
if(_valid34){
valid99 = true;
passing3 = 3;
if(props9 !== true){
props9 = props9 || {};
props9.kind = true;
props9.policy = true;
props9.completeRepositoryCheck = true;
}
}
}
}
}
if(!valid99){
const err131 = {instancePath:instancePath+"/operationScope",schemaPath:"#/oneOf/15/properties/operationScope/oneOf",keyword:"oneOf",params:{passingSchemas: passing3},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err131];
}
else {
vErrors.push(err131);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs468;
if(vErrors !== null){
if(_errs468){
vErrors.length = _errs468;
}
else {
vErrors = null;
}
}
}
if(errors === _errs466){
if(data204 && typeof data204 == "object" && !Array.isArray(data204)){
let missing35;
if((((data204.kind === undefined) && (missing35 = "kind")) || ((data204.policy === undefined) && (missing35 = "policy"))) || ((data204.completeRepositoryCheck === undefined) && (missing35 = "completeRepositoryCheck"))){
validate52.errors = [{instancePath:instancePath+"/operationScope",schemaPath:"#/oneOf/15/properties/operationScope/required",keyword:"required",params:{missingProperty: missing35},message:"must have required property '"+missing35+"'"}];
return false;
}
else {
const _errs484 = errors;
for(const key28 in data204){
if(!(((key28 === "kind") || (key28 === "policy")) || (key28 === "completeRepositoryCheck"))){
validate52.errors = [{instancePath:instancePath+"/operationScope",schemaPath:"#/oneOf/15/properties/operationScope/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key28},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs484 === errors){
if(data204.kind !== undefined){
let data216 = data204.kind;
const _errs485 = errors;
if(!((data216 === "selected-files") || (data216 === "stdin"))){
validate52.errors = [{instancePath:instancePath+"/operationScope/kind",schemaPath:"#/oneOf/15/properties/operationScope/properties/kind/enum",keyword:"enum",params:{allowedValues: schema19.oneOf[15].properties.operationScope.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid104 = _errs485 === errors;
}
else {
var valid104 = true;
}
if(valid104){
if(data204.policy !== undefined){
const _errs486 = errors;
if("repository" !== data204.policy){
validate52.errors = [{instancePath:instancePath+"/operationScope/policy",schemaPath:"#/oneOf/15/properties/operationScope/properties/policy/const",keyword:"const",params:{allowedValue: "repository"},message:"must be equal to constant"}];
return false;
}
var valid104 = _errs486 === errors;
}
else {
var valid104 = true;
}
if(valid104){
if(data204.completeRepositoryCheck !== undefined){
const _errs487 = errors;
if(false !== data204.completeRepositoryCheck){
validate52.errors = [{instancePath:instancePath+"/operationScope/completeRepositoryCheck",schemaPath:"#/oneOf/15/properties/operationScope/properties/completeRepositoryCheck/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"}];
return false;
}
var valid104 = _errs487 === errors;
}
else {
var valid104 = true;
}
}
}
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/operationScope",schemaPath:"#/oneOf/15/properties/operationScope/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid98 = _errs466 === errors;
}
else {
var valid98 = true;
}
if(valid98){
if(data.complete !== undefined){
const _errs488 = errors;
if(true !== data.complete){
validate52.errors = [{instancePath:instancePath+"/complete",schemaPath:"#/oneOf/15/properties/complete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid98 = _errs488 === errors;
}
else {
var valid98 = true;
}
if(valid98){
if(data.policyObservationComplete !== undefined){
const _errs489 = errors;
if(true !== data.policyObservationComplete){
validate52.errors = [{instancePath:instancePath+"/policyObservationComplete",schemaPath:"#/oneOf/15/properties/policyObservationComplete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid98 = _errs489 === errors;
}
else {
var valid98 = true;
}
if(valid98){
if(data.type !== undefined){
const _errs490 = errors;
if("selection-terminal" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/15/properties/type/const",keyword:"const",params:{allowedValue: "selection-terminal"},message:"must be equal to constant"}];
return false;
}
var valid98 = _errs490 === errors;
}
else {
var valid98 = true;
}
}
}
}
}
}
}
}
}
else if(tag0 === "format-preview-change"){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing36;
if((((((((((((((data.schemaVersion === undefined) && (missing36 = "schemaVersion")) || ((data.requestId === undefined) && (missing36 = "requestId"))) || ((data.type === undefined) && (missing36 = "type"))) || ((data.operation === undefined) && (missing36 = "operation"))) || ((data.path === undefined) && (missing36 = "path"))) || ((data.changed === undefined) && (missing36 = "changed"))) || ((data.sourceSha256 === undefined) && (missing36 = "sourceSha256"))) || ((data.sourceByteLength === undefined) && (missing36 = "sourceByteLength"))) || ((data.candidateSha256 === undefined) && (missing36 = "candidateSha256"))) || ((data.candidateByteLength === undefined) && (missing36 = "candidateByteLength"))) || ((data.coreSourceInputsSha256 === undefined) && (missing36 = "coreSourceInputsSha256"))) || ((data.icuVersion === undefined) && (missing36 = "icuVersion"))) || ((data.unicodeVersion === undefined) && (missing36 = "unicodeVersion"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/16/required",keyword:"required",params:{missingProperty: missing36},message:"must have required property '"+missing36+"'"}];
return false;
}
else {
const _errs492 = errors;
for(const key29 in data){
if(!(func1.call(schema19.oneOf[16].properties, key29))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/16/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key29},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs492 === errors){
if(data.operation !== undefined){
const _errs493 = errors;
if("format" !== data.operation){
validate52.errors = [{instancePath:instancePath+"/operation",schemaPath:"#/oneOf/16/properties/operation/const",keyword:"const",params:{allowedValue: "format"},message:"must be equal to constant"}];
return false;
}
var valid106 = _errs493 === errors;
}
else {
var valid106 = true;
}
if(valid106){
if(data.type !== undefined){
const _errs494 = errors;
if("format-preview-change" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/16/properties/type/const",keyword:"const",params:{allowedValue: "format-preview-change"},message:"must be equal to constant"}];
return false;
}
var valid106 = _errs494 === errors;
}
else {
var valid106 = true;
}
}
}
}
}
}
else if(tag0 === "format-preview-terminal"){
const _errs495 = errors;
const _errs497 = errors;
let valid109 = true;
const _errs498 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.preflightComplete !== undefined){
if(true !== data.preflightComplete){
const err132 = {};
if(vErrors === null){
vErrors = [err132];
}
else {
vErrors.push(err132);
}
errors++;
}
}
}
var _valid35 = _errs498 === errors;
errors = _errs497;
if(vErrors !== null){
if(_errs497){
vErrors.length = _errs497;
}
else {
vErrors = null;
}
}
let ifClause2;
if(_valid35){
const _errs500 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing37;
if(((((data.selectedPathCount === undefined) && (missing37 = "selectedPathCount")) || ((data.changedPathCount === undefined) && (missing37 = "changedPathCount"))) || ((data.qualityPassed === undefined) && (missing37 = "qualityPassed"))) || ((data.findingCount === undefined) && (missing37 = "findingCount"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/17/allOf/0/then/required",keyword:"required",params:{missingProperty: missing37},message:"must have required property '"+missing37+"'"}];
return false;
}
}
var _valid35 = _errs500 === errors;
valid109 = _valid35;
ifClause2 = "then";
}
else {
const _errs501 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing38;
if((data.message === undefined) && (missing38 = "message")){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/17/allOf/0/else/required",keyword:"required",params:{missingProperty: missing38},message:"must have required property '"+missing38+"'"}];
return false;
}
}
var _valid35 = _errs501 === errors;
valid109 = _valid35;
ifClause2 = "else";
}
if(!valid109){
const err133 = {instancePath,schemaPath:"#/oneOf/17/allOf/0/if",keyword:"if",params:{failingKeyword: ifClause2},message:"must match \""+ifClause2+"\" schema"};
if(vErrors === null){
vErrors = [err133];
}
else {
vErrors.push(err133);
}
errors++;
validate52.errors = vErrors;
return false;
}
if(errors === _errs495){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing39;
if((((((((((data.schemaVersion === undefined) && (missing39 = "schemaVersion")) || ((data.requestId === undefined) && (missing39 = "requestId"))) || ((data.operation === undefined) && (missing39 = "operation"))) || ((data.complete === undefined) && (missing39 = "complete"))) || ((data.preflightComplete === undefined) && (missing39 = "preflightComplete"))) || ((data.sourceObservationsComplete === undefined) && (missing39 = "sourceObservationsComplete"))) || ((data.coreSourceInputsSha256 === undefined) && (missing39 = "coreSourceInputsSha256"))) || ((data.icuVersion === undefined) && (missing39 = "icuVersion"))) || ((data.unicodeVersion === undefined) && (missing39 = "unicodeVersion"))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/17/required",keyword:"required",params:{missingProperty: missing39},message:"must have required property '"+missing39+"'"}];
return false;
}
else {
const _errs502 = errors;
for(const key30 in data){
if(!(func1.call(schema19.oneOf[17].properties, key30))){
validate52.errors = [{instancePath,schemaPath:"#/oneOf/17/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key30},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs502 === errors){
if(data.operation !== undefined){
const _errs503 = errors;
if("format" !== data.operation){
validate52.errors = [{instancePath:instancePath+"/operation",schemaPath:"#/oneOf/17/properties/operation/const",keyword:"const",params:{allowedValue: "format"},message:"must be equal to constant"}];
return false;
}
var valid111 = _errs503 === errors;
}
else {
var valid111 = true;
}
if(valid111){
if(data.complete !== undefined){
const _errs504 = errors;
if(true !== data.complete){
validate52.errors = [{instancePath:instancePath+"/complete",schemaPath:"#/oneOf/17/properties/complete/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid111 = _errs504 === errors;
}
else {
var valid111 = true;
}
if(valid111){
if(data.type !== undefined){
const _errs505 = errors;
if("format-preview-terminal" !== data.type){
validate52.errors = [{instancePath:instancePath+"/type",schemaPath:"#/oneOf/17/properties/type/const",keyword:"const",params:{allowedValue: "format-preview-terminal"},message:"must be equal to constant"}];
return false;
}
var valid111 = _errs505 === errors;
}
else {
var valid111 = true;
}
}
}
}
}
}
}
}
else {
validate52.errors = [{instancePath,schemaPath:"#/discriminator",keyword:"discriminator",params:{error: "mapping", tag: "type", tagValue: tag0},message:"value of tag \"type\" must be in oneOf"}];
return false;
}
}
else {
validate52.errors = [{instancePath,schemaPath:"#/discriminator",keyword:"discriminator",params:{error: "tag", tag: "type", tagValue: tag0},message:"tag \"type\" must be string"}];
return false;
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

