import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, StrategyOptions } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService,
  ) {
    // Ensure that Google OAuth credentials are set in environment variables
    if (!configService.get('GOOGLE_CLIENT_ID') || !configService.get('GOOGLE_CLIENT_SECRET')) {
      throw new Error('Missing Google OAuth credentials');
    }

    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: 'http://localhost:5000/auth/google/callback',
      scope: ['email', 'profile'],
    } as StrategyOptions);
  }

  // This method is called after user grants permission
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    // Validate user with AuthService and return the user object
    const user = await this.authService.validateUserByGoogle(profile);
    return user; // Return the full user object
  }
}