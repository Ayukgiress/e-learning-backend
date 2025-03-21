import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Res,
  Query,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUserDto } from './dto/current-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateRoleDto } from './dto/update-role';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService  
  ) {}

  // Public route for user registration
  @Post('/signup')
  async signUp(@Body() signUpDto: SignUpDto): Promise<{ message: string }> {
    await this.authService.signUp(signUpDto);
    return {
      message:
        'Registration successful! Please check your email to verify your account.',
    };
  }

  // Public route for user login
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<{ token: string }> {
    const token = await this.authService.login(loginDto);
    return { token };
  }

  // Protected route to get current user information
  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async getCurrentUser(@Request() req): Promise<CurrentUserDto> {
    return this.authService.getCurrentUser(req.user.id);
  }

  // Google auth initiation endpoint
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
  
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      console.log('Google callback received with profile structure:', 
        Object.keys(req.user || {}).join(', '));
      
      console.log('AuthController instance:', this);
      console.log('JwtService available:', !!this.jwtService);
      
      if (!req.user) {
        console.error('No profile in vbhjhhjreq.user - potential Passport strategy issue');
      } else if (!req.user.id && !req.user._json?.sub) {
        console.error('Profile missing Google ID - this will create a random user');
      }
      
      const { token, needsRoleSelection } = await this.authService.validateUserByGoogleAndGetRoleInfo(req.user);
      
      // Get the frontend URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const baseUrl = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;
      
      const redirectUrl = `${baseUrl}/auth/callback?token=${encodeURIComponent(token)}&needsRole=${needsRoleSelection}`;
      
      console.log('Redirecting to:', redirectUrl);
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google-auth-failed&message=${encodeURIComponent(error.message)}`);
    }
  }

  
  // Public route to request password reset
  @Post('/forgot-password')
  async forgotPassword(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(email);
    return { message: 'Password reset email sent.' };
  }

  // Public route to reset password
  @Post('/reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(token, newPassword);
    return { message: 'Password successfully reset.' };
  }

  // Public route for email verification
  @Get('/verify-email')
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<{ message: string }> {
    await this.authService.verifyEmail(token);
    return { message: 'Email verified successfully! You can now log in.' };
  }

  // Protected route for changing password
  @UseGuards(JwtAuthGuard)
  @Post('/change-password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(req.user.id, changePasswordDto);
    return { message: 'Password changed successfully.' };
  }

  @Post('update-role')
  @UseGuards(JwtAuthGuard)
  async updateRole(@Body() updateRoleDto: UpdateRoleDto, @Request() req) {
    const userId = req.user.id;
    const { role } = updateRoleDto;
    return this.authService.updateRole(userId, role);
  }
}