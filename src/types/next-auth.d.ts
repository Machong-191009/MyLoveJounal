import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      coupleId?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    coupleId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    coupleId?: string | null;
  }
}
