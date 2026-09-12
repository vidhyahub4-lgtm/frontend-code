export interface Board {
  _id: string;
  boardName: string;
  startMonth: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** POST body still uses "board" as the key even though the list
 * response returns it back as "boardName". */
export interface CreateBoardRequest {
  board: string;
  startMonth: string;
}

export interface GetBoardsResponse {
  success: boolean;
  message: string;
  boards: Board[];
}

export interface InstituteType {
  _id: string;
  instituteType: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInstituteTypeRequest {
  instituteType: string;
}

export interface GetInstituteTypesResponse {
  success: boolean;
  message: string;
  instituteTypes: InstituteType[];
}

export interface State {
  _id: string;
  stateName: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStateRequest {
  stateName: string;
}

export interface GetStatesResponse {
  success: boolean;
  message: string;
  states: State[];
}

export interface City {
  _id: string;
  cityName: string;
  pinCode: number;
  stateId: { _id: string };
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCityRequest {
  cityName: string;
  stateId: string;
  pinCode: string;
}

export interface GetCitiesResponse {
  success: boolean;
  message: string;
  cities: City[];
}

export interface SchoolClass {
  _id: string;
  className: string;
  classInWord: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClassRequest {
  className: string;
  classInWord: string;
}

export interface GetClassesResponse {
  success: boolean;
  message: string;
  classes: SchoolClass[];
}

export interface Section {
  _id: string;
  sectionName: string;
  classId: { _id: string; className: string };
  Maxlimit: number;
  to?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSectionRequest {
  sectionName: string;
  classId: string;
  Maxlimit: string;
  to?: string;
}

export interface GetSectionsResponse {
  success: boolean;
  message: string;
  sections: Section[];
}

export interface SchoolCityRef {
  _id: string;
  cityName: string;
}

export interface SchoolStateRef {
  _id: string;
  stateName: string;
}

export interface SchoolBoardRef {
  _id: string;
  boardName: string;
}

export interface School {
  _id: string;
  schName: string;
  schAdd: string;
  schInfo?: string;
  cityId: SchoolCityRef;
  stateId: SchoolStateRef;
  schoolCode: string;
  websiteUrl?: string;
  contact1: string;
  contact2?: string;
  schemail: string;
  /** Not populated by the backend — just the user's id. */
  admin: string;
  selectBoard: SchoolBoardRef;
  instituteType: string;
  schLogo?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSchoolRequest {
  schName: string;
  schAdd: string;
  schInfo?: string;
  cityId: string;
  stateId: string;
  schoolCode: string;
  websiteUrl?: string;
  contact1: string;
  contact2?: string;
  schemail: string;
  admin: string;
  selectBoard: string;
  instituteType: string;
}

export interface GetSchoolsResponse {
  success: boolean;
  message: string;
  schools: School[];
}

export interface CheckSchoolCodeResponse {
  success: boolean;
  message: string;
  available: boolean;
  code: string;
}

// ---- School Setting: Class/Section Setup (maps a global Class+Section to a School) ----

export interface SchClassRef {
  _id: string;
  className: string;
  classInWord: string;
}

export interface SchSectionRef {
  _id: string;
  sectionName: string;
  Maxlimit: number;
}

export interface SchSchoolRef {
  _id: string;
  schName: string;
  schoolCode: string;
}

export interface SchClass {
  _id: string;
  classID: SchClassRef;
  sectionID: SchSectionRef;
  schCode: string;
  schoolID: SchSchoolRef;
  createdBy?: string;
}

export interface CreateSchClassRequest {
  schoolID: string;
  schCode: string;
  sectionID: string;
  classID: string;
}

export interface GetSchClassesResponse {
  success: boolean;
  message: string;
  schClasses: SchClass[];
}

// ---- Super Admin: Fee Setting -> Class PayMode Setup ----

export interface PayModeInstallment {
  id: number;
  installment: string;
  _id?: string;
}

export interface PayModeFeeStructureEntry {
  class: SchClassRef;
  duration: string;
  payModeDuration: string;
  installment: PayModeInstallment[];
  _id?: string;
}

export interface SchoolPayModeSetup {
  _id: string;
  schId: SchSchoolRef;
  schCode: string;
  session: string;
  feeStructure: PayModeFeeStructureEntry[];
  createdAt?: string;
}

/** Payload shape for creating a fresh school+session pay mode setup.
 * `class` here is the raw id (not populated) since this is what the
 * backend expects on write. */
export interface CreatePayModeFeeStructureEntry {
  class: string;
  duration: string;
  payModeDuration: string;
  installment: { id: number; installment: string }[];
}

export interface CreateSchoolPayModeRequest {
  schId: string;
  schCode: string;
  session: string;
  feeStructure: CreatePayModeFeeStructureEntry[];
}

export interface GetSchoolPayModeResponse {
  success: boolean;
  message: string;
  feeStructure: SchoolPayModeSetup[];
}

export interface UpdateFeeStructureEntryRequest {
  setupId: string;
  entryId: string;
  duration?: string;
  payModeDuration?: string;
  installment?: { id: number; installment: string }[];
}
