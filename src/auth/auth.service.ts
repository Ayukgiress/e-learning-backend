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

    const token = await this.createToken(user._id.toString()); 
    return token; 
  }

 async createToken(userId: string): Promise<string> {
  const user = await this.userModel.findById(userId);
  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  console.log("Creating token with role:", user.role);
  
  return this.jwtService.sign(
    { 
      id: userId,
      role: user.role 
    }, 
    { expiresIn: '24h' }
  );
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

  async validateUserByGoogle(profile: any): Promise<string> {
    try {
      console.log('VALIDATING GOOGLE USER...');
      
      let user: User | null = await this.userModel.findOne({ googleId: profile.id });
      
      if (!user) {
        let email: string | null = null;
        
        if (profile.emails && profile.emails.length > 0) {
          email = profile.emails[0].value;
          console.log('Found email in emails array:', email);
        } 
        else if (profile._json && profile._json.email) {
          email = profile._json.email;
          console.log('Found email in _json:', email);
        }
        else if (profile.email) {
          email = profile.email;
          console.log('Found email in direct property:', email);
        }
        else {
          for (const key in profile) {
            if (typeof profile[key] === 'string' && key.toLowerCase().includes('email')) {
              email = profile[key];
              console.log(`Found email in property ${key}:`, email);
              break;
            }
          }
        }
        
        if (!email) {
          console.error('No email found in profile, using placeholder');
          email = `google_user_${profile.id}@placeholder.com`;
        }
        
        const firstName = profile.name?.givenName || profile._json?.given_name || 'Google';
        const lastName = profile.name?.familyName || profile._json?.family_name || 'User';
        
        console.log('Creating user with:', { firstName, lastName, email, googleId: profile.id });
        
        user = await this.userModel.create({
          firstName,
          lastName,
          email,
          googleId: profile.id,
          userId: uuidv4(),
          role: 'student',
          isEmailVerified: true,
        });
        
        if (user) {
          console.log('User created successfully:', user.email);
        }
      } else {
        console.log('Found existing Google user:', user.email);
      }
      
      if (user) {
        return this.createToken(user._id.toString());
      } else {
        throw new UnauthorizedException('User not found');
      }
    } catch (error) {
      console.error('Error in validateUserByGoogle:', error);
      throw error;
    }
  }

  async validateUserByGoogleAndGetRoleInfo(profile: any): Promise<{ token: string, needsRoleSelection: boolean }> {
    try {
      console.log('VALIDATING GOOGLE USER WITH ROLE INFO...');
      
      let user: User | null = await this.userModel.findOne({ googleId: profile.id });
      let needsRoleSelection = false;
      
      if (!user) {
        let email: string | null = null;
        
        if (profile.emails && profile.emails.length > 0) {
          email = profile.emails[0].value;
        } 
        else if (profile._json && profile._json.email) {
          email = profile._json.email;
        }
        else if (profile.email) {
          email = profile.email;
        }
        else {
          for (const key in profile) {
            if (typeof profile[key] === 'string' && key.toLowerCase().includes('email')) {
              email = profile[key];
              break;
            }
          }
        }
        
        if (!email) {
          email = `google_user_${profile.id}@placeholder.com`;
        }
        
        // Extract name information with defaults
        const firstName = profile.name?.givenName || profile._json?.given_name || 'Google';
        const lastName = profile.name?.familyName || profile._json?.family_name || 'User';
        
        console.log('Creating user with:', { firstName, lastName, email, googleId: profile.id });
        
        needsRoleSelection = true;
        
        user = await this.userModel.create({
          firstName,
          lastName,
          email,
          googleId: profile.id,
          userId: uuidv4(),
          role: null, 
          isEmailVerified: true,
        });
      } else {
        // Check if existing user has a role
        needsRoleSelection = !user.role;
        console.log('Found existing Google user:', user.email, 'needsRoleSelection:', needsRoleSelection);
      }
      
      if (user) {
        return {
          token: await this.createToken(user._id.toString()),
          needsRoleSelection
        };
      } else {
        throw new UnauthorizedException('User not found');
      }
    } catch (error) {
      console.error('Error in validateUserByGoogleAndGetRoleInfo:', error);
      throw error;
    }
  }

  async updateRole(userId: string, role: string): Promise<{ token: string, message: string }> {
    try {
      const user = await this.userModel.findById(userId);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      const validRoles = ['student', 'instructor', 'admin'];
      if (!validRoles.includes(role)) {
        throw new UnauthorizedException('Invalid role');
      }
      
      user.role = role;
      await user.save();
      
      const newToken = await this.createToken(user._id.toString());
      
      return { 
        token: newToken,
        message: `Role updated to ${role} successfully` 
      };
    } catch (error) {
      console.error('Error updating role:', error);
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
}