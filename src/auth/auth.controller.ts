import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { JwtAuthGuard } from './jwt-auth.guard'; 
import { CurrentUserDto } from './dto/current-user.dto'; 

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

  @UseGuards(JwtAuthGuard) // Protect this route with JWT guard
  @Get('/me') // Route to get the current user
  async getCurrentUser(@Request() req): Promise<CurrentUserDto> {
    return this.authService.getCurrentUser(req.user.id); // Assuming req.user.id contains the user ID
  }
}