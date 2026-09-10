export interface LoginRequest {
  loginUserName: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  firstname: string;
  lastname: string;
  loginUserName: string;
  email: string;
  phoneno: number;
  userType: string;
  image: string;
}

export interface SidebarItem {
  _id?: string;
  text: string;
  permission: number[];
  link: string;
  icon?: string;
  children?: SidebarItem[];
  order?: number;
  isActive?: boolean;
}

export interface LoginSuccessData {
  user: AuthUser;
  sidebar: SidebarItem[];
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  data: LoginSuccessData;
}
