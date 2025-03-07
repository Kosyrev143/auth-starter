import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Provider, Token, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { add } from 'date-fns';
import { v4 } from 'uuid';

import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { Tokens } from './interfaces';
import { LoginDto, RegisterDto } from './dto';
import { compareSync } from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async refresh(
    refresh_token: string,
    user_agent: string,
    remember_me = false,
  ): Promise<Tokens> {
    const token = await this.prisma.token.delete({
      where: { token: refresh_token },
    });
    if (!token || new Date(token.exp) < new Date()) {
      throw new UnauthorizedException();
    }
    const user = await this.userService.findOne(token.userId);
    return this.generateTokens(user, user_agent, remember_me);
  }

  async register(dto: RegisterDto) {
    const user: User = await this.userService
      .findOne(dto.email)
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (user) {
      throw new ConflictException('User already exists');
    }
    return this.userService.save(dto).catch((err) => {
      this.logger.error(err);
      return null;
    });
  }

  async login(dto: LoginDto, user_agent: string): Promise<Tokens> {
    const user: User = await this.userService
      .findOne(dto.email)
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (!user || !compareSync(dto.password, user.password)) {
      throw new UnauthorizedException('Credentials not valid');
    }
    return this.generateTokens(user, user_agent, dto.remember_me ?? false);
  }

  private async generateTokens(
    user: User,
    user_agent: string,
    remember_me: boolean,
  ): Promise<Tokens> {
    const access_token =
      'Bearer ' +
      this.jwtService.sign({
        id: user.id,
        email: user.email,
        roles: user.roles,
      });
    const refresh_token = await this.getRefreshToken(
      user.id,
      user_agent,
      remember_me,
    );
    return { access_token, refresh_token };
  }

  private async getRefreshToken(
    userId: string,
    user_agent: string,
    remember_me: boolean,
  ): Promise<Token> {
    const _token = await this.prisma.token.findFirst({
      where: {
        userId,
        userAgent: user_agent,
      },
    });
    const token = _token?.token ?? '';
    return this.prisma.token.upsert({
      where: { token },
      update: {
        token: v4(),
        exp: remember_me
          ? add(new Date(), { months: 1 })
          : add(new Date(), { hours: 12 }),
      },
      create: {
        token: v4(),
        exp: remember_me
          ? add(new Date(), { months: 1 })
          : add(new Date(), { hours: 12 }),
        userId,
        userAgent: user_agent,
      },
    });
  }

  deleteRefreshToken(token: string) {
    return this.prisma.token.delete({ where: { token } });
  }

  // async providerAuth(email: string, user_agent: string, provider: Provider) {
  //   const userExists = await this.userService.findOne(email);
  //   if (userExists) {
  //     const user = await this.userService
  //       .save({ email, provider })
  //       .catch((err) => {
  //         this.logger.error(err);
  //         return null;
  //       });
  //     return this.generateTokens(user, user_agent);
  //   }
  //   const user = await this.userService
  //     .save({ email, provider })
  //     .catch((err) => {
  //       this.logger.error(err);
  //       return null;
  //     });
  //   if (!user) {
  //     throw new BadRequestException();
  //   }
  //   return this.generateTokens(user, user_agent);
  // }
}
