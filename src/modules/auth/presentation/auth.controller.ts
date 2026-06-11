import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AuthService } from '@modules/auth/application/use-cases/auth.service';
import { TwoFactorService } from '@modules/auth/application/use-cases/two-factor.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  UsuarioResponseDto,
  Verify2faDto,
  Login2faDto,
  Enable2faResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@modules/auth/application/dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Usuario } from '@modules/auth/domain/entities/usuario.entity';
import { AuthMapper } from '@modules/auth/application/mappers/auth.mapper';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión (si tiene 2FA retorna requiere_2fa: true)' })
  @ApiResponse({ status: 200, description: 'Login exitoso o requiere 2FA' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('login-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login con código 2FA' })
  @ApiResponse({ status: 200, description: 'Login exitoso con 2FA', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales o código 2FA inválido' })
  async loginWith2fa(@Body() dto: Login2faDto): Promise<AuthResponseDto> {
    return this.authService.loginWith2fa(dto.correo, dto.contrasena, dto.codigo_2fa);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens con refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens renovados', type: AuthResponseDto })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario', type: UsuarioResponseDto })
  async getProfile(@CurrentUser() usuario: Usuario): Promise<UsuarioResponseDto> {
    return AuthMapper.toResponseDto(usuario);
  }

  // ── 2FA Endpoints ──

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generar QR y secret para activar 2FA' })
  @ApiResponse({ status: 201, description: 'QR generado', type: Enable2faResponseDto })
  async generate2fa(@CurrentUser() usuario: Usuario): Promise<Enable2faResponseDto> {
    return this.twoFactorService.generateSecret(usuario.usuario_id);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código y activar 2FA' })
  @ApiResponse({ status: 200, description: '2FA activado' })
  @ApiResponse({ status: 401, description: 'Código inválido' })
  async verify2fa(
    @CurrentUser() usuario: Usuario,
    @Body() dto: Verify2faDto,
  ) {
    return this.twoFactorService.verify(usuario.usuario_id, dto.codigo);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar 2FA (requiere código actual)' })
  @ApiResponse({ status: 200, description: '2FA desactivado' })
  async disable2fa(
    @CurrentUser() usuario: Usuario,
    @Body() dto: Verify2faDto,
  ) {
    return this.twoFactorService.disable(usuario.usuario_id, dto.codigo);
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Consultar si 2FA está activo' })
  @ApiResponse({ status: 200, description: 'Estado del 2FA' })
  async get2faStatus(@CurrentUser() usuario: Usuario) {
    return this.twoFactorService.getStatus(usuario.usuario_id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar enlace de recuperación de contraseña' })
  @ApiResponse({ status: 200, description: 'Correo enviado si el email existe' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.correo);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.nueva_contrasena);
  }

  @Post('2fa/regenerate-backup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerar códigos de respaldo (requiere código TOTP actual)' })
  @ApiResponse({ status: 200, description: 'Nuevos códigos generados' })
  async regenerateBackupCodes(
    @CurrentUser() usuario: Usuario,
    @Body() dto: Verify2faDto,
  ) {
    return this.twoFactorService.regenerateBackupCodes(usuario.usuario_id, dto.codigo);
  }
}