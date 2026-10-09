/** Request body of POST /school-settings/create-sch-house */
export interface CreateSchHouseRequest {
  schId: string;
  /** New house names; the backend merges them into the school's existing list. */
  house: string[];
}

/** One document per school; `house` holds every house added so far. */
export interface SchHouseRecord {
  _id: string;
  schId: string | { _id: string };
  house: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSchHouseResponse {
  success: boolean;
  message: string;
  schHouse: SchHouseRecord;
}

/**
 * GET /school-settings/get-sch-house?schId=
 * The list currently comes back under `schClasses` (legacy key name); `schHouse`
 * is read too so the page keeps working once the backend key is renamed.
 */
export interface GetSchHousesResponse {
  success: boolean;
  message: string;
  schClasses?: SchHouseRecord[];
  schHouse?: SchHouseRecord[];
}
