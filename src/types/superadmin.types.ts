export interface Board {
  _id: string;
  board: string;
  startMonth: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBoardRequest {
  board: string;
  startMonth: string;
}

export interface InstituteType {
  _id: string;
  instituteType: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInstituteTypeRequest {
  instituteType: string;
}
