export interface LoginRequest {
  loginUserName: string;
  email: string;
  password: string;
}

/** The school a (non-superAdmin) user belongs to, sent with the login response. */
export interface AuthSchool {
  schid: string;
  schoolName: string;
  schoolLogo?: string;
  /** Not sent by the backend yet; pages that need it fall back to "". */
  schoolCode?: string;
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
  sch?: AuthSchool | null;
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
