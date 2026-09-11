export type UserType = "superAdmin" | "admin";

export interface User {
  _id: string;
  firstname: string;
  lastname: string;
  loginUserName: string;
  email: string;
  phoneno: number;
  userType: UserType;
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
}

export interface GetUsersResponse {
  success: boolean;
  message: string;
  users: User[];
}
