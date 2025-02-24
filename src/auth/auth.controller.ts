import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Get, Request, Res, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { JwtAuthGuard } from './jwt-auth.guard'; 
import { CurrentUserDto } from './dto/current-user.dto'; 
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto'; 

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Public route for user registration
  @Post('/signup')
  async signUp(@Body() signUpDto: SignUpDto): Promise<{ message: string }> {
    await this.authService.signUp(signUpDto);
    return { message: 'Registration successful! Please check your email to verify your account.' }; 
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

  // Google OAuth routes (public)
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {
    // Initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const user = req.user; 
    const token = this.authService.createToken(user._id.toString()); 
    res.redirect(`http://localhost:3000?token=${token}`); 
  }

  // Public route to request password reset
  @Post('/forgot-password')
  async forgotPassword(@Body('email') email: string): Promise<{ message: string }> {
    await this.authService.forgotPassword(email);
    return { message: 'Password reset email sent.' };
  }

  // Public route to reset password
  @Post('/reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(token, newPassword);
    return { message: 'Password successfully reset.' };
  }

  // Public route for email verification
  @Get('/verify-email')
  async verifyEmail(@Query('token') token: string): Promise<{ message: string }> {
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
}