import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-yandex';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('YANDEX_APP_ID'),
      clientSecret: config.getOrThrow<string>('YANDEX_APP_SECRET'),
      callbackURL: 'http://localhost:3000/api/auth/yandex/callback',
    });
  }

  async validate(
    access_token: string,
    refresh_token: string,
    profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { id, displayName, emails, photos } = profile;
    const user = {
      id,
      displayName,
      email: emails[0].value,
      picture: photos[0].value,
      accessToken: access_token,
    };
    done(null, user);
  }
}
