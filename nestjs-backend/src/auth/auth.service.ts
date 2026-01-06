import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getDatabase } from '../db/database.config';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { LoginDto, AuthResponseDto } from '../dto/auth.dto';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private get db() {
    return getDatabase(this.configService);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    // Find user across all tenants by email
    const [userRecord] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!userRecord) {
      return null;
    }

    // Check if user is active
    if (!userRecord.isActive) {
      return null;
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, userRecord.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return this.mapToUser(userRecord);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.getTokenExpiration(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        tenantId: user.tenantId,
      },
    };
  }

  async findById(userId: string): Promise<User | null> {
    const [userRecord] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    return userRecord ? this.mapToUser(userRecord) : null;
  }

  async findByIdOrThrow(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async createUser(
    tenantId: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    roles: string[] = ['user']
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);

    const [userRecord] = await this.db
      .insert(schema.users)
      .values({
        tenantId,
        email,
        passwordHash,
        firstName,
        lastName,
        roles: roles.join(','),
        isActive: true,
      })
      .returning();

    return this.mapToUser(userRecord);
  }

  private mapToUser(data: any): User {
    return {
      id: data.id,
      tenantId: data.tenantId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      roles: data.roles ? data.roles.split(',') : [],
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private getTokenExpiration(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1d');
    
    // Parse expiresIn to seconds
    if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 24 * 60 * 60;
    }
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 60 * 60;
    }
    if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60;
    }
    if (expiresIn.endsWith('s')) {
      return parseInt(expiresIn);
    }
    
    // Default to 1 day
    return 24 * 60 * 60;
  }
}