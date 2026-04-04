export type AuthSession = {
  email: string;
  loggedInAt: string;
};

export type RegisteredUser = {
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthActionResult = {
  ok: boolean;
  message?: string;
};
