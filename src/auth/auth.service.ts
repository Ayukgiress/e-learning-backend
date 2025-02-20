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

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
    private emailService: EmailService, 
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<void> {
    const { firstName, lastName, email, password } = signUpDto;

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4(); // Generate a unique verification token

    const user = await this.userModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      userId: uuidv4(), // Generate a unique userId
      emailVerificationToken: verificationToken, // Store the token
      isEmailVerified: false, 
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

    // if (!user.isEmailVerified) {
    //   throw new UnauthorizedException('Email not verified');
    // }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.createToken(user._id.toString()); 

    return token; 
  }

  createToken(userId: string): string {
    return this.jwtService.sign({ id: userId }); 
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
    let user: User | null = await this.userModel.findOne({ googleId: profile.id });

    if (!user) {
      user = await this.userModel.create({
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value,
        googleId: profile.id,
        userId: uuidv4(),
      });
    }

    return this.createToken(user._id.toString()); 
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = this.jwtService.sign({ id: user._id }, { expiresIn: '1h' }); 
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

    user.isEmailVerified = true; // Update verification status
    user.emailVerificationToken = undefined; // Clear the token
    await user.save();
  }
}