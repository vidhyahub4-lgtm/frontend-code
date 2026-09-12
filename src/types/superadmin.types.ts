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
