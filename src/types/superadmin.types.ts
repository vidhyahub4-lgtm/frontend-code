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
