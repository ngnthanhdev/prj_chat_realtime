import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Admin } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { generateOpaqueToken, hashToken } from '../common/utils/tokens';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateAdmin(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const matches = await bcrypt.compare(password, admin.passwordHash);
    if (!matches) throw new UnauthorizedException('Invalid credentials');

    return admin;
  }

  async login(admin: Admin, response: Response, meta?: { userAgent?: string; ipAddress?: string }) {
    const accessToken = await this.jwtService.signAsync(
      { sub: admin.id, email: admin.email, displayName: admin.displayName },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as JwtSignOptions['expiresIn'],
      },
    );

    const rawRefreshToken = generateOpaqueToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.adminRefreshToken.create({
      data: {
        adminId: admin.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    this.setAuthCookies(response, accessToken, rawRefreshToken, refreshExpiresAt);

    return {
      admin: this.serializeAdmin(admin),
    };
  }

  async refresh(rawRefreshToken: string | undefined, response: Response) {
    if (!rawRefreshToken) throw new UnauthorizedException('Missing refresh token');

    const hashed = hashToken(rawRefreshToken);
    const refreshToken = await this.prisma.adminRefreshToken.findFirst({
      where: {
        tokenHash: hashed,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { admin: true },
    });

    if (!refreshToken) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.adminRefreshToken.update({
      where: { id: refreshToken.id },
      data: { revokedAt: new Date() },
    });

    return this.login(refreshToken.admin, response);
  }

  async logout(rawRefreshToken: string | undefined, response: Response) {
    if (rawRefreshToken) {
      await this.prisma.adminRefreshToken.updateMany({
        where: { tokenHash: hashToken(rawRefreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    this.clearAuthCookies(response);
    return { success: true };
  }

  async getMe(adminId: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('Admin not found');
    return { admin: this.serializeAdmin(admin) };
  }

  private serializeAdmin(admin: Admin) {
    return {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      createdAt: admin.createdAt,
    };
  }

  private setAuthCookies(response: Response, accessToken: string, refreshToken: string, refreshExpiresAt: Date) {
    const accessCookieName = this.configService.get<string>('ACCESS_COOKIE_NAME') ?? 'prj_chat_rt_access';
    const refreshCookieName = this.configService.get<string>('REFRESH_COOKIE_NAME') ?? 'prj_chat_rt_refresh';

    response.cookie(accessCookieName, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 15 * 60 * 1000,
    });

    response.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      expires: refreshExpiresAt,
    });
  }

  private clearAuthCookies(response: Response) {
    const accessCookieName = this.configService.get<string>('ACCESS_COOKIE_NAME') ?? 'prj_chat_rt_access';
    const refreshCookieName = this.configService.get<string>('REFRESH_COOKIE_NAME') ?? 'prj_chat_rt_refresh';
    response.clearCookie(accessCookieName);
    response.clearCookie(refreshCookieName);
  }
}
