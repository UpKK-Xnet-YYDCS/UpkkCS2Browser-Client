// User login response data from the API
export interface UserLoginData {
  uid: number;
  username: string;
  steamid64: string;
  steamid32?: string;
  steamaccountid: number;
  isLogin?: boolean;
  isAutoLogin?: boolean;
  user_auth: string;
  login_type?: string;
  login_time?: number;
  ua?: string;
}

// Login response structure
export interface LoginResponse {
  success: boolean;
  code: number;
  message: string;
  remaining_attempts: number;
  data?: UserLoginData;
}

// Stored user session info
export interface UserSession {
  uid: number;
  username: string;
  steamid64: string;
  user_auth: string;
  isLogin: boolean;
}
