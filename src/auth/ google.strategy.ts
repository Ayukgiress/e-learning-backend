import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
  ) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Missing Google OAuth credentials');
    }

    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback';
    
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: callbackUrl,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string, 
    refreshToken: string, 
    profile: Profile
  ): Promise<any> {
    try {
      console.log('Google profile received:', { 
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails?.map(e => e.value) || []
      });
      
      // Return the full profile to be used in the controller
      return profile;
    } catch (error) {
      console.error('ERROR IN VALIDATE:', error.message);
      throw error;
    }
  }
}