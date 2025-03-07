import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseInterceptors,
} from '@nestjs/common';

import { UserService } from './user.service';
import { UserResponse } from './responses';
import { JwtPayload } from '../auth/interfaces';
import { CurrentUser } from 'common/decorators';
import { User } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':idOrEmail')
  @UseInterceptors(ClassSerializerInterceptor)
  async findOneUser(@Param('idOrEmail') idOrEmail: string) {
    const user = await this.userService.findOne(idOrEmail);
    return new UserResponse(user);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.userService.delete(id, user);
  }

  @Get()
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Put()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateUser(@Body() dto: Partial<User>) {
    const user = await this.userService.save(dto);
    return new UserResponse(user);
  }
}
