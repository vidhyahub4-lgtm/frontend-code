export type UserType = "superAdmin" | "admin";

export interface User {
  _id: string;
  firstname: string;
  lastname: string;
  loginUserName: string;
  email: string;
  phoneno: number;
  userType: UserType;
  /** School the user belongs to (admins only); the list API may return just the id. */
  schid?: string | { _id: string; schName?: string } | null;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  firstname: string;
  lastname: string;
  loginUserName: string;
  email: string;
  phoneno: number;
  password: string;
  userType: UserType;
  /** Required by the backend when userType is "admin". */
  schid?: string;
}

export interface GetUsersResponse {
  success: boolean;
  message: string;
  users: User[];
}
