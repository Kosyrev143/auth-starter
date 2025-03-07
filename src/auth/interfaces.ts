import { Role, Token } from '@prisma/client';

export interface Tokens {
  access_token: string;
  refresh_token: Token;
}

export interface JwtPayload {
  id: string;
  email: string;
  roles: Role[];
}
