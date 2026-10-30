export { runWord } from './RunWord';
export { SimulationPlayback } from './SimulationPlayback';
export type { StateVisual, TapeCell, TapeCellStatus } from './SimulationPlayback';
export { describeStep, describeVerdict } from './simulation/describe';
export type { VerdictView } from './simulation/describe';
export { DefinitionDraft } from './definition/DefinitionDraft';
export type { StateDraft } from './definition/DefinitionDraft';
export { validateDefinitionDraft } from './definition/validateDefinitionDraft';
export type {
  DefinitionErrors,
  DefinitionValidation,
  RegexIssue,
} from './definition/validateDefinitionDraft';
export { ConstructionState } from './construction/ConstructionState';
export type { Link, LinkRef, PlacedState } from './construction/ConstructionState';
export { ConstructionHistory } from './construction/ConstructionHistory';
export type { EditResult } from './construction/ConstructionHistory';
export { Verification } from './verification/Verification';
export type { VerificationStatus, VerificationView } from './verification/Verification';
export { describeAgreement } from './verification/agreement';
export type { AgreementView } from './verification/agreement';
export { fileNameOf, isDirty, parseProject, serializeProject, DEFAULT_FILE_NAME } from './project/projectFile';
export type { ParseOutcome } from './project/projectFile';
export type { OpenResult, ProjectFiles, SaveResult } from './project/ProjectFiles';
export { imageFileName } from './project/ImageFiles';
export type { ImageFiles, ImageFormat } from './project/ImageFiles';
export { openProject, saveProject } from './project/projectUseCases';
export type { OpenOutcome, SaveOutcome } from './project/projectUseCases';
export { convertToDfa } from './conversion/convertToDfa';
export type { ConversionOptions, ConversionOutcome } from './conversion/convertToDfa';
export { generateTestWords, runTestWords } from './testing/testWords';
export type { TestFailure, TestReport, TestResult, TestWordSet } from './testing/testWords';
export { sameDefinition } from './construction/sameDefinition';
export { BOUNDS, CANVAS, clampToBounds, NODE_RADIUS } from './construction/layout';
export type { Point } from './construction/layout';
// Types du domaine exposés au renderer (qui ne doit pas importer core directement)
export type { Diagnostic, LanguageDefinition } from '../core';
