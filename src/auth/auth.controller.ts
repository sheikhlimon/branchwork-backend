import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterOrgDto } from "./dto/register-org.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "./strategies/jwt.strategy";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register-org")
  @ApiOperation({
    summary: "Register organization and create initial owner account",
  })
  @ApiResponse({
    status: 201,
    description: "Organization registered successfully with JWT session.",
  })
  @ApiResponse({
    status: 409,
    description: "Email is already registered.",
  })
  async registerOrg(@Body() dto: RegisterOrgDto) {
    return this.authService.registerOrg(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log in with email and password" })
  @ApiResponse({
    status: 200,
    description: "Authenticated successfully. Returns access token and scoped profile.",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid email or password.",
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current authenticated user profile and permissions",
  })
  @ApiResponse({
    status: 200,
    description: "Session user profile with active branch and role claims.",
  })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
