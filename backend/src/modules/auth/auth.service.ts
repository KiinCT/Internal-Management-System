import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { AuthUser } from '../../common/decorators';
import { UserDocument } from '../users/schemas/user.schema';
import { BCRYPT_ROUNDS, UsersService } from '../users/users.service';
import { ChangePasswordDto, LoginDto, TokenPair } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithSecrets(dto.email);
    // Dùng chung một thông báo để không lộ email nào tồn tại
    const invalid = new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (!user) throw invalid;
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw invalid;
    if (!user.isActive) throw new UnauthorizedException('Tài khoản đã bị khóa');

    const tokens = await this.issueTokens(user);
    await this.usersService.touchLogin(user.id);
    return { ...tokens, user: user.toJSON() };
  }

  /** Rotation: mỗi refresh token chỉ dùng được một lần. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: AuthUser & { type?: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token hết hạn hoặc không hợp lệ');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Sai loại token');

    const user = await this.usersService.findByIdWithSecrets(payload.sub);
    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Phiên đăng nhập đã kết thúc');
    }
    if (!AuthService.safeEqual(AuthService.hashToken(refreshToken), user.refreshTokenHash)) {
      // Token cũ bị dùng lại -> nghi bị đánh cắp, thu hồi toàn bộ phiên
      await this.usersService.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }
    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithSecrets(userId);
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu cũ');
    }
    await this.usersService.setPassword(userId, await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS));
    return { success: true };
  }

  private async issueTokens(user: UserDocument): Promise<TokenPair> {
    const payload: AuthUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId ? String(user.departmentId) : null,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(
        // jti ngẫu nhiên đảm bảo mỗi refresh token là duy nhất
        { sub: user.id, type: 'refresh', jti: randomUUID() },
        {
          secret: this.config.get<string>('jwt.refreshSecret'),
          expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
        },
      ),
    ]);
    await this.usersService.setRefreshTokenHash(user.id, AuthService.hashToken(refreshToken));
    return { accessToken, refreshToken };
  }

  /**
   * SHA-256 cho refresh token (không dùng bcrypt vì bcrypt chỉ xét 72 byte đầu,
   * mà các JWT của cùng một user có phần đầu giống hệt nhau).
   */
  static hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private static safeEqual(a: string, b: string) {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }
}
