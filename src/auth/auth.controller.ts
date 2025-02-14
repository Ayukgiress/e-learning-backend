import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Get, Request, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { JwtAuthGuard } from './jwt-auth.guard'; 
import { CurrentUserDto } from './dto/current-user.dto'; 
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  async signUp(@Body() signUpDto: SignUpDto): Promise<{ token: string }> {
    const token = await this.authService.signUp(signUpDto);
    return { token }; 
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<{ token: string }> {
    const token = await this.authService.login(loginDto);
    return { token }; 
  }

  @UseGuards(JwtAuthGuard) 
  @Get('/me') 
  async getCurrentUser(@Request() req): Promise<CurrentUserDto> {
    return this.authService.getCurrentUser(req.user.id); 
  }

  // Google OAuth routes

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {
    // Initiates the Google authentication process
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const user = req.user; // User returned from Google
    const token = this.authService.createToken(user); // Implement createToken in AuthService
    res.redirect(`http://yourfrontend.com?token=${token}`); // Redirect with token
  }
}