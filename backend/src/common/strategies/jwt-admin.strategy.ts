import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type AdminJwtPayload = {
  sub: string;
  email: string;
  displayName: string;
};

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: { cookies?: Record<string, string> } | undefined) =>
          request?.cookies?.[configService.get<string>('ACCESS_COOKIE_NAME') ?? 'prj_chat_rt_access'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') ?? 'change-me-access',
    });
  }

  async validate(payload: AdminJwtPayload) {
    return payload;
  }
}
