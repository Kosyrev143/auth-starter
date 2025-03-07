import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleGuard } from './google.guard';
import { YandexGuard } from './yandex.guard';

export const GUARDS = [JwtAuthGuard, GoogleGuard, YandexGuard];
