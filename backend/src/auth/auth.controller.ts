import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto';

@Controller('auth/admin')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() body: AdminLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const admin = await this.authService.validateAdmin(body.email, body.password);
    return this.authService.login(admin, response, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const rawRefreshToken = request.cookies?.[this.refreshCookieName];
    return this.authService.refresh(rawRefreshToken, response);
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const rawRefreshToken = request.cookies?.[this.refreshCookieName];
    return this.authService.logout(rawRefreshToken, response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentAdmin() admin: { sub: string }) {
    return this.authService.getMe(admin.sub);
  }

  private get refreshCookieName() {
    return this.configService.get<string>('REFRESH_COOKIE_NAME') ?? 'prj_chat_rt_refresh';
  }
}
