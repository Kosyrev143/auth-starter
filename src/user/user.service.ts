import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Role, User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { hashSync, genSaltSync } from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { convertToSecondsUtil } from 'common/utils';
import { JwtPayload } from '../auth/interfaces';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private readonly config: ConfigService,
  ) {}

  async save(user: Partial<User>) {
    const hashedPassword = user?.password
      ? this.hashPassword(user.password)
      : null;
    const savedUser = await this.prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword ?? undefined,
        provider: user?.provider ?? undefined,
        roles: user?.roles ?? undefined,
        isBlocked: user?.isBlocked ?? undefined,
      },
      create: {
        email: user.email,
        password: hashedPassword,
        provider: user.provider,
        roles: ['USER'],
      },
    });
    await this.cache.set(savedUser.id, savedUser);
    await this.cache.set(savedUser.email, savedUser);
    return savedUser;
  }

  async findOne(idOrEmail: string, isReset = false): Promise<User> {
    if (isReset) {
      await this.cache.del(idOrEmail);
    }
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: idOrEmail }, { email: idOrEmail }],
      },
    });
    if (!user) {
      return null;
    }
    await this.cache.set(
      idOrEmail,
      user,
      convertToSecondsUtil(this.config.getOrThrow<string>('JWT_EXP')),
    );
    return user;
  }

  async delete(id: string, user: JwtPayload) {
    if (user.id !== id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException();
    }
    await Promise.all([this.cache.del(id), this.cache.del(user.email)]);
    return this.prisma.user.delete({ where: { id }, select: { id: true } });
  }

  private hashPassword(password: string) {
    return hashSync(password, genSaltSync(10));
  }
}
