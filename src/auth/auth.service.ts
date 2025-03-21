import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid'; 
import { CurrentUserDto } from './dto/current-user.dto'; 
import { EmailService } from './email.service'; 
import { ChangePasswordDto } from './dto/change-password.dto'; 

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
    private emailService: EmailService, 
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<void> {
    const { firstName, lastName, email, password, role } = signUpDto;

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const user = await this.userModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      userId: uuidv4(),
      emailVerificationToken: verificationToken,
      isEmailVerified: false,
      role: role,
    });

    const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;
    
    await this.emailService.sendEmail({
      to: email,
      subject: 'Email Verification',
      text: `Please verify your email by clicking on the following link: ${verificationLink}`,
    });
  }

  async login(loginDto: LoginDto): Promise<string> {
    const { email, password } = loginDto;
  
    const user = await this.userModel.findOne({ email });
  
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
  
    const isPasswordMatched = await bcrypt.compare(password, user.password);
  
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }
  
    const token = this.jwtService.sign({ 
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }, { expiresIn: '24h' }); 
    
    return token; 
  }



  async createToken(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.jwtService.sign({ 
      id: userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }, { expiresIn: '7d' }); 
  }

  async getCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.userModel.findById(userId).select('-password'); 
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userId: user.userId,
      role: user.role,
    };
  }

  async validateUserByGoogleAndGetRoleInfo(profile: any): Promise<{ token: string, needsRoleSelection: boolean }> {
    const token = await this.validateUserByGoogle(profile);
    const decoded = this.jwtService.decode(token);
    const needsRoleSelection = !decoded.role;
    return { token, needsRoleSelection };
  }

  async validateUserByGoogle(profile: any): Promise<string> {
    try {
      
      console.log('Raw Google profile:', JSON.stringify(profile, null, 2));
      
      const googleId = profile.id || 
                      (profile._json && profile._json.sub) || 
                      `google_${uuidv4()}`;
      
      console.log('Using Google ID:', googleId);
      
      // Check if user already exists with this Google ID
      let user = await this.userModel.findOne({ googleId });
      
      if (!user) {
        console.log('No existing user with Google ID, checking email');
        
        let email: string | null = null;
        
        if (profile.emails && profile.emails.length > 0) {
          email = profile.emails[0].value;
          console.log('Found email in emails array:', email);
        } else if (profile._json && profile._json.email) {
          email = profile._json.email; 
          console.log('Found email in _json:', email);
        } else if (profile.email) {
          email = profile.email;
          console.log('Found email in direct property:', email);
        } 
        
        if (!email) {
          console.error('*** WARNING: No email found in Google profile ***');
          console.error('This will create a placeholder user that cannot be identified');
          email = `google_user_${googleId}@placeholder.com`;
        }
        
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
          console.log('Found existing user with email:', email);
          existingUser.googleId = googleId;
          await existingUser.save();
          return this.createToken(existingUser._id.toString());
        }
        
        const firstName = 
          (profile.name && profile.name.givenName) || 
          (profile._json && profile._json.given_name) ||
          (profile.given_name) ||
          email.split('@')[0] || 
          'Google';
          
        const lastName = 
          (profile.name && profile.name.familyName) || 
          (profile._json && profile._json.family_name) ||
          (profile.family_name) ||
          'User';
        
        console.log('Creating new user with:', { firstName, lastName, email, googleId });
        
        user = await this.userModel.create({
          firstName,
          lastName,
          email,
          googleId,
          userId: uuidv4(),
          isEmailVerified: true,
        });
        
        console.log('New user created successfully:', user._id);
      } else {
        console.log('Found existing user with Google ID:', user.email);
      }
      
      // Check if user has a role
      if (!user.role) {
        console.log('User has no role, role selection will be required');
      } else {
        console.log('User already has role:', user.role);
      }
      
      return this.createToken(user._id.toString());
    } catch (error) {
      console.error('Error in validateUserByGoogle:', error);
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = this.jwtService.sign({ id: user._id }, { expiresIn: 3600 });
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Password Reset',
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const payload = this.jwtService.verify(token); 

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userModel.findById(payload.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword; 
    await user.save();
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userModel.findOne({ emailVerificationToken: token });

    if (!user) {
      throw new NotFoundException('Invalid or expired token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordMatched = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();
  }

  async updateRole(userId: string, role: string) {
    const validRoles = ['student', 'instructor', 'admin'];

    if (!validRoles.includes(role.toLowerCase())) {
      throw new Error('Invalid role selection');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    user.role = role.toLowerCase();
    const updatedUser = await user.save();

    const payload = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
    };

    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h',
    });

    return {
      message: 'Role updated successfully',
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
      },
    };
  }
}