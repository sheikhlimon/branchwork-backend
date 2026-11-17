import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "../auth.service";

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  branchId: string | null;
  roleId: string | null;
  roleName: string | null;
  isOwner: boolean;
  permissions?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload || !payload.sub || !payload.organizationId) {
      throw new UnauthorizedException("Invalid token payload");
    }
    return {
      id: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      branchId: payload.branchId || null,
      roleId: payload.roleId || null,
      roleName: payload.roleName || null,
      isOwner: payload.isOwner,
      permissions: payload.permissions || (payload.isOwner ? ["*"] : []),
    };
  }
}
