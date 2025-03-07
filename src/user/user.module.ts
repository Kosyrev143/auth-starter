import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [CacheModule.register()],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
