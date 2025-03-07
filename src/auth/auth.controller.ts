import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Response, Request } from 'express';

import { AuthService } from './auth.service';
import { Tokens } from './interfaces';
import { LoginDto, RefreshDto, RegisterDto } from './dto';
import { UserResponse } from '../user/responses';
import { UserAgent, Public, Cookie } from 'common/decorators';

const REFRESH_TOKEN = 'refreshtoken';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  @Post('register')
  @UseInterceptors(ClassSerializerInterceptor)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return new UserResponse(user);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res() response: Response,
    @UserAgent() user_agent: string,
  ) {
    const tokens = await this.authService.login(dto, user_agent);
    this.setRefreshTokenToCookies(tokens, response);
  }

  @Get('logout')
  async logout(
    @Cookie(REFRESH_TOKEN) refresh_token: string,
    @Res() response: Response,
  ) {
    if (!refresh_token) {
      response.sendStatus(HttpStatus.OK);
      return;
    }
    await this.authService.deleteRefreshToken(refresh_token);
    response.cookie(REFRESH_TOKEN, '', {
      httpOnly: true,
      secure: true,
      expires: new Date(),
    });
    response.sendStatus(HttpStatus.OK);
  }

  @Get('refresh-tokens')
  async refresh(
    @Cookie(REFRESH_TOKEN) refresh_token: string,
    @Res() response: Response,
    @UserAgent() user_agent: string,
    @Body() dto: RefreshDto,
  ) {
    if (!refresh_token) {
      throw new UnauthorizedException();
    }
    const tokens = await this.authService.refresh(
      refresh_token,
      user_agent,
      dto?.remember_me,
    );
    if (!tokens) {
      throw new UnauthorizedException();
    }
    this.setRefreshTokenToCookies(tokens, response);
  }

  private setRefreshTokenToCookies(tokens: Tokens, res: Response) {
    if (!tokens) {
      throw new UnauthorizedException();
    }
    res.cookie(REFRESH_TOKEN, tokens.refresh_token.token, {
      httpOnly: true,
      sameSite: 'lax',
      expires: new Date(tokens.refresh_token.exp),
      secure:
        this.config.getOrThrow<string>('NODE_ENV', 'development') ===
        'production',
      path: '/',
    });
    res.status(HttpStatus.CREATED).json({ access_token: tokens.access_token });
  }

  @Get('google')
  googleAuth() {}

  @Get('google/callback')
  googleAuthCallback(@Req() request: Request, @Res() response: Response) {
    const token = request.user['accessToken'];
    return response.redirect(
      `http://localhost:3000/api/auth/succes-google?token=${token}`,
    );
  }

  @Get('success-google')
  successGoogle() {}

  @Get('yandex')
  yandexAuth() {}

  @Get('yandex/callback')
  yandexAuthCallback() {}

  @Get()
  successYandex() {}
}
