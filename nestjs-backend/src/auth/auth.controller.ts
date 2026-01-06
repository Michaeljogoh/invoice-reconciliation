import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, AuthResponseDto, CreateUserDto } from '../dto/auth.dto';


@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and obtain JWT token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: AuthResponseDto,
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'admin@acme.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['admin'],
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async login(@Body(ValidationPipe) loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }


@Post('register')
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Create a new user' })
@ApiResponse({
  status: HttpStatus.CREATED,
  description: 'User created successfully',
})
@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
async register(
  @Body(ValidationPipe) dto: CreateUserDto,
) {
  const user = await this.authService.createUser(
    dto.tenantId,
    dto.email,
    dto.password,
    dto.firstName,
    dto.lastName,
    dto.roles ?? ['user'],
  );

  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}




}